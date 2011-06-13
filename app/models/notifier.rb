class Notifier < ActionMailer::Base
  default_url_options[:host] = RAILS_ENV == 'development' ? 'localhost' : 'usselfstoragelocator.com'
  layout 'simple_mailer'
  
  #
  # TO: admins
  #
  def diego_a_msg(msg)
    setup_email "diego@usselfstoragelocator.com", "server@usselfstoragelocator.com", 'SERVER MESSAGE'
    @body[:msg] = msg
  end
  
  def comment_notification(recipient, comment, host, form)
    setup_email recipient, comment.email, 'New website comment'
    @body[:comment] = comment
    @body[:host]    = host
    @body[:form]    = form
  end
  
  def new_tip_alert(tip)
    setup_email 'info@usselfstoragelocator.com', 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'New tip created in USSSL!'
    @body[:tip] = tip
  end
  
  def new_contact_alert(comment, page)
    setup_email 'info@usselfstoragelocator.com', 'USSSL Notifier <notifier@usselfstoragelocator.com>', "New Message: #{comment.title}"
    @body[:comment] = comment
  end
  
  def new_client_alert(client)
    @header_img_name = 'new_client'
    
    setup_email 'info@usselfstoragelocator.com', 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'New Client!'
    @body[:client] = client
  end
  
  def client_activated_alert(client)
    @header_img_name = 'new_client'
    
    setup_email 'info@usselfstoragelocator.com', 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'Client Activated!'
    @body[:client] = client
  end
  
  def new_tenant_alert(tenant)
    @header_img_name = 'unit_rental'
    
    setup_email 'info@usselfstoragelocator.com', 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'New Tenant!'
    @body[:tenant] = tenant
    @body[:rental] = tenant.rental
  end
  
  def new_info_request_alert(info_request)
    @header_img_name = 'info_request'
    
    setup_email 'info@usselfstoragelocator.com', 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'New Info Request!'
    @body[:listing] = info_request.listing
    @body[:info_request] = info_request
  end
  
  def admin_reservation_alert(reserver, reservation, comments)
    @header_img_name = 'reserve_request'
    
    setup_email 'info@usselfstoragelocator.com', 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'New Reservation'
    @body[:user]        = reserver
    @body[:reservation] = reservation
    @body[:comments]    = comments
  end
  
  def tracking_request(listing, client, phone)
    @header_img_name = 'tracking_number_request'
    
    setup_email 'info@usselfstoragelocator.com', 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'Call Tracking Request'
    @body[:listing] = listing
    @body[:client]  = client
    @body[:phone]   = phone
  end
  
  def review_alert(review)
    setup_email 'info@usselfstoragelocator.com', 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'New Facility Review'
    @body[:review] = review
  end
  
  def claimed_listings_alert(client, listings)
    setup_email 'info@usselfstoragelocator.com', 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'A Client Has Claimed More Listings'
    @body[:client]   = client
    @body[:listings] = listings
  end
  
  def top_cities_list(list)
    setup_email 'info@usselfstoragelocator.com', 'USSSL Admin <notifier@usselfstoragelocator.com>', 'Our Top Active Cities'
    @body[:list] = list
  end
  
  def old_client_file(file_path)
    setup_email 'info@usselfstoragelocator.com', 'USSSL Admin <notifier@usselfstoragelocator.com>', 'Oldest Client List'
    attachment :content_type => 'text/csv', :body => File.read(file_path), :filename => file_path.split('/').last
  end
  
  def billing_processed_alert(model, billing, invoice)
    setup_email 'info@usselfstoragelocator.com', 'USSSL Admin <notifier@usselfstoragelocator.com>', 'Client Billed!'
    @body[:billable]     = billing.listing ? billing.listing : model
    @body[:billing_info] = billing
    @body[:invoice]      = invoice
  end
  
  def billing_removed_alert(model, billing, invoice)
    setup_email 'info@usselfstoragelocator.com', 'USSSL Admin <notifier@usselfstoragelocator.com>', 'Client Billing Removed'
    @body[:billable]     = billing.listing ? billing.listing : model
    @body[:billing_info] = billing
    @body[:invoice]      = invoice
  end
  
  def tenant_billing_processed_alert(tenant)
    setup_email 'info@usselfstoragelocator.com', 'USSSL Admin <notifier@usselfstoragelocator.com>', 'Client Billed!'
    @body[:tenant]  = tenant
    @body[:rental]  = tenant.rental
    @body[:listing] = tenant.listing
    @body[:invoice] = tenant.invoice
  end
  
  def tenant_billing_removed_alert(tenant, billing, invoice)
    setup_email 'info@usselfstoragelocator.com', 'USSSL Admin <notifier@usselfstoragelocator.com>', 'Client Billing Removed'
    @body[:billable]     = billing.listing ? billing.listing : model
    @body[:billing_info] = billing
    @body[:invoice]      = invoice
  end
  
  #
  # TO: Facility staff
  #
  
  def client_notification(client)
    setup_email client.email, 'USSelfStorageLocator.com <info@usselfstoragelocator.com>', 'Pending Verification'
    @body[:client] = client
  end
  
  def client_activation(client)
    setup_email client.email, 'USSelfStorageLocator.com <info@usselfstoragelocator.com>', 'Activate Your Account'
    @body[:client] = client
  end
  
  def rental_notification(tenant)
    @header_img_name = 'unit_rental'
    setup_email tenant.listing.notify_email, 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'New Rental!'
    @body[:tenant]  = tenant
    @body[:rental]  = tenant.rental
    @body[:listing] = tenant.listing
  end
  
  def info_request_client_notification(info_request)
    @header_img_name = 'reserve_request'
    
    setup_email info_request.listing.notify_email, 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'You Received a Request on USSSL'
    @body[:listing] = info_request.listing
    @body[:info_request] = info_request
  end
  
  def copy_to_all_listings_notification(client, listing, what)
    setup_email client.email, 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'Your listings have been updated'
    @body[:client]  = client
    @body[:listing] = listing
    @body[:what]    = what
  end

  def activated_listings_notification(client, listings)
    setup_email client.email, 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'Your Facilities Have Been Activated'
    @body[:client]   = client
    @body[:listings] = listings
  end

  def tracking_number_ready(client, listing)
    setup_email client.email, 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'Your Tracking Number Is Ready'
    @body[:client]  = client
    @body[:listing] = listing
  end
  
  def review_published_notification(review, listing)
    setup_email listing.client.email, 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'Someone Has Reviewed Your Facility'
    @body[:review]  = review
    @body[:listing] = listing
  end
  
  def billing_processed_notification(model, billing, invoice)
    email = model.respond_to?(:email) ? model.email : model.notify_email
    setup_email email, 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'Your Billing Info Has Been Updated'
    @body[:billable]     = billing.listing ? billing.listing : model
    @body[:billing_info] = billing
    @body[:invoice]      = invoice
  end
  
  def billing_removed_notification(model, billing, invoice)
    email = model.respond_to?(:email) ? model.email : model.notify_email
    setup_email email, 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'Billing Has Ended'
    @body[:billable]     = billing.listing ? billing.listing : model
    @body[:billing_info] = billing
    @body[:invoice]      = invoice
  end
  
  #
  # TO: tenants, reservers, searchers
  #
  
  def tenant_notification(tenant)
    @header_img_name = 'rental_confirm'
    
    setup_email tenant.email, 'USSelfStorageLocator.com <info@usselfstoragelocator.com>', "Your #{tenant.listing.storage_type.try(:titleize) || 'Self Storage'} Rental"
    @body[:tenant] = tenant
    @body[:rental] = tenant.rental
  end
  
  def subscriber_notification(subscriber)
    setup_email subscriber.email, 'USSelfStorageLocator.com <info@usselfstoragelocator.com>', 'Your Subscription'
    @body[:subscriber] = subscriber
  end
  
  def tenant_confirmation(reserver, reservation)
    @header_img_name = 'reservation'
    
    setup_email reserver.email, 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'Your Self Storage Reservation'
    @body[:user]        = reserver
    @body[:reservation] = reservation
  end
  
  def info_request_user_notification(info_request)
    @header_img_name = 'info_request'
    
    setup_email info_request.email, 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'We Received Your Request'
    @body[:listing]      = info_request.listing
    @body[:info_request] = info_request
  end
  
  def review_request(recipient, message, listing, client)
    setup_email recipient, client.email, 'Please review my facility'
    @body[:message] = message
    @body[:listing] = listing
    @body[:client]  = client
  end
  
  #
  # Common
  #
  
  def password_reset_instructions(user)
    setup_email user.email, 'USSelfStorageLocator.com <info@usselfstoragelocator.com>', 'Password Reset Instructions'
    @body[:user] = user
  end
  
  private
  
  def setup_email(recipient, from, subject = '')
    @email_title = @subject = subject
    @recipients = recipient
    @from       = from
    @sent_on    = Time.now.utc
    content_type  'text/html'
  end
  
end
