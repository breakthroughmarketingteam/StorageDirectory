class Notifier < ActionMailer::Base
  default_url_options[:host] = RAILS_ENV == 'development' ? 'localhost' : 'usselfstoragelocator.com'
  
  def comment_notification(recipient, comment, host)
    setup_email recipient, comment.email, 'New website comment'
    @body[:comment] = comment
    @body[:host]    = host
  end
  
  def subscriber_notification(recipient, user, host)
    setup_email recipient, user.email, 'New mailing list subscriber'
    @body[:user] = user
    @body[:host] = host
  end
  
  def client_notification(client)
    setup_email client.email, 'USSelfStorageLocator.com <info@usselfstoragelocator.com>', 'Pending Verification'
    @body[:client] = client
  end
  
  def client_activation(client)
    setup_email client.email, 'USSelfStorageLocator.com <info@usselfstoragelocator.com>', 'Activate Your Account'
    @body[:client] = client
  end
  
  def tenant_notification(user, rental)
    setup_email user.email, 'USSelfStorageLocator.com <info@usselfstoragelocator.com>', 'Your Self Storage Rental'
    @body[:user] = user
    @body[:rental] = rental
  end
  
  def new_tip_alert(tip)
    setup_email 'info@usselfstoragelocator.com', 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'New tip created in USSSL!'
    @body[:tip] = tip
  end
  
  def new_contact_alert(comment, page)
    setup_email 'info@usselfstoragelocator.com', 'USSSL Notifier <notifier@usselfstoragelocator.com>', "New Message: #{comment.title}"
    @body[:comment] = comment
  end
  
  def tenant_confirmation(reserver, reservation)
    setup_email reserver.email, 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'Self Storage Reservation'
    @body[:user]        = reserver
    @body[:reservation] = reservation
  end
  
  def new_client_alert(client)
    setup_email 'info@usselfstoragelocator.com', 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'New Client!'
    @body[:client] = client
  end
  
  def new_tenant_alert(tenant, rental)
    setup_email 'info@usselfstoragelocator.com', 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'New Tenant!'
    @body[:tenant] = tenant
    @body[:rental] = rental
  end
  
  def new_info_request_alert(listing, info_request)
    setup_email 'info@usselfstoragelocator.com', 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'New Info Request!'
    @body[:listing] = listing
    @body[:info_request] = info_request
  end
  
  def admin_reservation_alert(reserver, reservation, comments)
    setup_email 'info@usselfstoragelocator.com', 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'New Reservation'
    @body[:user]        = reserver
    @body[:reservation] = reservation
    @body[:comments]    = comments
  end
  
  def password_reset_instructions(user)
    setup_email user.email, 'USSelfStorageLocator.com <info@usselfstoragelocator.com>', 'Password Reset Instructions'
    @body[:user] = user
  end
  
  def review_request(recipient, message, listing, client)
    setup_email recipient, client.email, 'Please review my facility'
    @body[:message] = message
    @body[:listing] = listing
    @body[:client] = client
  end
  
  def tracking_request(listing, client, phone)
    setup_email 'info@usselfstoragelocator.com', 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'Call Tracking Request'
    @body[:listing] = listing
    @body[:client] = client
    @body[:phone] = phone
  end
  
  def review_alert(review)
    setup_email 'info@usselfstoragelocator.com', 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'New Facility Review'
    @body[:review] = review
  end
  
  def claimed_listings_alert(client, listings)
    setup_email 'info@usselfstoragelocator.com', 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'A Client Has Claimed More Listings'
    @body[:client] = client
    @body[:listings] = listings
  end
  
  def setup_email(recipient, from, subject = '')
    @recipients = recipient
    @from       = from
    @subject    = subject
    @sent_on    = Time.now.utc
  end
  
end
