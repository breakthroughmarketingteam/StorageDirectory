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
      delete_pending_transactions! self.billing_info, :memo => "#{$root_domain} account canceled. Account #{self.id}"
      super
    end
    
    # on the event that a listing creates its own billing info, the client has to
    # delete the old transaction and recalculate the new amount and submit it to gtb
    def update_previous_transaction!(old_billing, new_billing, should_rebill = true)
      iid = old_billing.invoice_id
      delete_pending_transactions! old_billing, :memo => "#{$root_domain} transaction removed. Account #{self.id}, Invoice #{iid}"
      process_billing_info! new_billing, :billing_amount => self.billing_amount, :memo => "#{$root_domain} billing updated on main account. Account #{self.id}, Invoice #{iid}" if should_rebill
    end
    
    def process_billing_info!(billing, options = {})
      @billing = billing
      gtb = GTB.new self.class.gtb_settings
      gtb.customer_info self.cust_info_hash(options)

      gtb.transaction_info({
        :transaction_type => options[:tran_type] || 'ES',
        :memo             => options[:memo]      || "#{$root_domain} billing begin",
        :occurrence_type  => options[:tran_type] || 'month',
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
    
      invoice = @billing.invoices.create response
      self.deliver_notifications @billing, invoice, true
    end
    
    def clean_billing_fields
      cnum = m.billing_info.card_number
      last4 = cnum[cnum.size - 4, cnum.size]
      m.billing_info.card_number = last4
      m.save
    end
    
    def delete_pending_transactions!(billing, options = {})
      @billing = billing
      gtb = GTB.new self.class.gtb_settings
      gtb.customer_info self.cust_info_hash options

      gtb.transaction_info({
        :transaction_type => 'RM',
        :invoice_id       => @billing.invoice_id,
        :memo             => options[:memo] || "#{$root_domain} billing end"
      })
      
      puts "\n\n----->GTB URL DATA RM\n----->#{gtb.url_data}\n\n"
      gtb.process
      response = gtb.response_info
      puts "\n\n----->GTB RESPONSE RM\n----->#{response.inspect}\n\n"
      
      invoice = @billing.invoices.create response
      self.deliver_notifications @billing, invoice, false
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
   
  end # END InstanceMethods
end