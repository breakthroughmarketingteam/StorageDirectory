module GoToBillable #:nodoc:

  def self.included(base)
    base.extend ClassMethods
  end

  module ClassMethods
    
    def acts_as_gotobillable(settings = {})
      require 'gtblib'
      include GoToBillable::InstanceMethods
      @@settings = settings
    end
    
    def card_type_codes
      @@card_type_codes ||= { 'Visa' => 'VS', 'Amex' => 'AX', 'MasterCard' => 'MC', 'Discover' => 'DC' }
    end
    
    def settings
      @@settings
    end
    
  end
  
  module InstanceMethods
    
    def after_save
      process_billing_info
      clean_billing_fields
    end
    
    def before_destroy
      delete_pending_transactions
    end
    
    def process_billing_info # why does this get called twice?
      unless @already_did_this
        @already_did_this = true
        
        gtb = GTB.new self.class.settings
        gtb.customer_info self.cust_info_hash

        gtb.transaction_info({
          :transaction_type => 'ES',
          :invoice_id       => self.invoice_id,
          :amount           => self.billable.billing_amount.to_s,
          :memo             => "#{$root_domain} billing begin",
          :occurrence_type  => 'month'
        })

        gtb.card_info({
          :cc_number => self.card_number.to_s,
          :cc_exp    => self.expires,
          :cc_name   => self.name,
          :cc_type   => self.card_type_code,
          :cc_cvv    => self.cvv.to_s
        })
      
        puts "\n\n----->GTB URL DATA\n----->#{gtb.url_data}\n\n"
        gtb.process
        response = gtb.response_info
        puts "\n\n----->GTB RESPONSE ES\n----->#{response.inspect}\n\n"
      
        self.without_callbacks :after_save do |m|
          invoice = m.invoices.build response
          m.deliver_notifications invoice, true
          m.save
        end
      end
    end
    
    def clean_billing_fields
      self.without_callbacks :after_save do |m|
        cnum = m.read_attribute :card_number
        last4 = cnum[cnum.size - 4, cnum.size]
        m.card_number = last4
        m.save
      end
    end
    
    def delete_pending_transactions
      gtb = GTB.new :merchant_id => self.class.merchant_id, :merchant_pin => self.class.merchant_pin, :ip_address => $server_ip
      gtb.customer_info self.cust_info_hash

      gtb.transaction_info({
        :transaction_type => 'RM',
        :invoice_id       => self.invoice_id,
        :memo             => "#{$root_domain} billing end"
      })
      
      gtb.process
      response = gtb.response_info
      puts "\n\n----->GTB RESPONSE RM\n----->#{response.inspect}\n\n"
      
      invoice = self.invoices.create response
      self.deliver_notifications invoice, false
    end
    
    def card_type_code
      self.class.card_type_codes[self.card_type]
    end

    def invoice_id
      "#{self.id}-#{self.updated_at.to_i}"
    end
    
    def cust_info_hash
      {
        :customer_id => self.billable.id.to_s,
        :first_name  => self.name.split(' ').first,
        :last_name   => self.name.split(' ').last,
        :company     => self.name,
        :address     => self.address,
        :city        => self.city,
        :state       => States.abbrev_of(self.state), 
        :zip         => self.zip.to_s,
        :country     => 'US', 
        :phone       => self.phone, 
        :email       => self.billable.email
      }
    end
   
  end # END InstanceMethods
end