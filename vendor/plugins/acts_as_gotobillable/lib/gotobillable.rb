module GoToBillable #:nodoc:

  def self.included(base)
    base.extend ClassMethods
  end

  module ClassMethods
    
    def acts_as_gotobillable(settings = {})
      require 'gtblib'
      include GoToBillable::InstanceMethods
      raise ArgumentError, 'One of gtb_settings values are missing.' unless has_required_gtb_settings? settings
      
      @@gtb_settings = settings
    end
    
    def has_required_gtb_settings?(settings)
      [:ip_address, :merchant_pin, :merchant_id].all? do |setting|
        settings.keys.include? setting
      end
    end
    
    def card_type_codes
      @@card_type_codes ||= { 'Visa' => 'VS', 'Amex' => 'AX', 'MasterCard' => 'MC', 'Discover' => 'DC' }
    end
    
    def gtb_settings
      @@gtb_settings
    end
    
  end
  
  module InstanceMethods
    
    def before_destroy
      delete_pending_transactions! self.billing_info, :memo => "#{USSSL_DOMAIN} account canceled. Account #{self.id}" if self.billing_info
      super
    end
    
    # on the event that a listing creates its own billing info, the client has to
    # delete the old transaction and recalculate the new amount and submit it to gtb
    def update_previous_transaction!(old_billing, new_billing, should_rebill = true)
      iid = old_billing.invoice_id
      delete_pending_transactions! old_billing, :memo => "#{USSSL_DOMAIN} transaction removed. Account #{self.id}, Invoice #{iid}"
      process_billing_info! new_billing, :billing_amount => self.billing_amount, :memo => "#{USSSL_DOMAIN} billing updated on main account. Account #{self.id}, Invoice #{iid}" if should_rebill
    end
    
    def process_billing_info!(billing, options = {})
      @billing = billing
      gtb = GTB.new self.class.gtb_settings
      gtb.customer_info self.cust_info_hash(options)

      gtb.transaction_info({
        :transaction_type => options[:tran_type] || 'ES',
        :notes            => options[:notes]     || "#{USSSL_DOMAIN} billing begin",
        :occurrence_type  => options[:occurence_type] || 'month',
        :process_date     => options[:process_date],
        :amount           => options[:billing_amount].to_s,
        :invoice_id       => @billing.invoice_id
      })

      gtb.card_info({
        :cc_number => @billing.card_number.to_s,
        :cc_exp    => @billing.expires,
        :cc_name   => @billing.name,
        :cc_type   => self.card_type_code,
        :cc_cvv    => @billing.cvv.to_s
      })
    
      puts "\n\n----->GTB URL DATA ES\n----->#{gtb.url_data}\n\n"
      gtb.process
      response = gtb.response_info
      puts "\n\n----->GTB RESPONSE ES\n----->#{response.inspect}\n\n"
      
      if response[:status] == 'G'
        invoice = @billing.invoices.build response
        self.send_billing_notifications @billing, invoice if self.is_a? Client
        self.billing_status = 'paying'
      else
        self.billing_status = 'failed'
        self.errors.add_to_base "Transaction Error: #{response[:description]}" 
      end
      
      self.clean_billing_fields!
      response
    end
    
    def delete_pending_transactions!(billing, options = {})
      @billing = billing
      gtb = GTB.new self.class.gtb_settings
      gtb.customer_info self.cust_info_hash options

      gtb.transaction_info({
        :transaction_type => 'RM',
        :invoice_id       => @billing.invoice_id,
        :memo             => options[:memo] || "#{USSSL_DOMAIN} billing end"
      })
      
      puts "\n\n----->GTB URL DATA RM\n----->#{gtb.url_data}\n\n"
      gtb.process
      response = gtb.response_info
      puts "\n\n----->GTB RESPONSE RM\n----->#{response.inspect}\n\n"
      
      invoice = @billing.invoices.create response
      self.send_billing_notifications @billing, invoice, false if self.is_a? Client
      response
    end
    
    def card_type_code
      @card_type_code ||= self.class.card_type_codes[@billing.card_type]
    end
    
    def cust_info_hash(options = {})
      @cust_info_hash ||= {
        :customer_id => self.id.to_s,
        :first_name  => @billing.name.split(' ').first,
        :last_name   => @billing.name.split(' ').last,
        :company     => @billing.name,
        :address     => @billing.address,
        :city        => @billing.city,
        :state       => States.abbrev_of(@billing.state), 
        :zip         => @billing.zip.to_s,
        :country     => 'US', 
        :phone       => @billing.phone, 
        :email       => options[:email]
      }
    end
    
    def clean_billing_fields!
      self.billing_info.card_number = last4 self.billing_info.card_number
      self.billing_info.save
    end
    
    def billing_diff?(billing_attr)
      return true unless billing_attr
      cnum1 = last4 self.card_number
      cnum2 = last4 billing_attr[:card_number]
      cnum1 != cnum2
    end
    
    def last4(c)
      c[c.size - 4, c.size]
    end
    
    def format_date(date)
      date.strftime '%Y%m%d'
    end
   
  end # END InstanceMethods
end