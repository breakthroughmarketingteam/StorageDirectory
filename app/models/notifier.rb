class Notifier < ActionMailer::Base
  default_url_options[:host] = RAILS_ENV == 'development' ? 'localhost:3000' : 'usselfstoragelocator.com'
  
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
    setup_email client.email, 'diego@usselfstoragelocator.com', 'Pending Verification'
    @body[:client] = client
  end
  
  def client_activation(client)
    setup_email client.email, 'diego@usselfstoragelocator.com', 'Activate Your Account'
    @body[:client] = client
  end
  
  def tenant_notification(user, rental)
    setup_email user.email, 'diego@usselfstoragelocator.com', 'Your Self Storage Rental'
    @body[:user] = user
    @body[:rental] = rental
  end
  
  def new_tip_alert(tip)
    setup_email 'moderator@usselfstoragelocator.com', 'notifier@usselfstoragelocator.com', 'New tip created in USSSL!'
    @body[:tip] = tip
  end
  
  def new_contact_alert(comment, page)
    setup_email 'diego@usselfstoragelocator.com', 'notifier@usselfstoragelocator.com', "New Message: #{comment.title}"
    @body[:comment] = comment
  end
  
  def tenant_confirmation(reserver, reservation)
    setup_email reserver.email, 'notifier@usselfstoragelocator.com', 'Self Storage Reservation'
    @body[:user]        = reserver
    @body[:reservation] = reservation
  end
  
  def new_client_alert(client)
    setup_email 'customer_care@usselfstoragelocator.com', 'diego@usselfstoragelocator.com', 'New Client!'
    @body[:client] = client
  end
  
  def new_tenant_alert(tenant, rental)
    setup_email 'customer_care@usselfstoragelocator.com', 'diego@usselfstoragelocator.com', 'New Tenant!'
    @body[:tenant] = tenant
    @body[:rental] = rental
  end
  
  def new_info_request_alert(listing, info_request)
    setup_email 'customer_care@usselfstoragelocator.com', 'diego@usselfstoragelocator.com', 'New Info Request!'
    @body[:listing] = listing
    @body[:info_request] = info_request
  end
  
  def admin_reservation_alert(reserver, reservation, comments)
    setup_email 'reservations@usselfstoragelocator.com', 'notifier@usselfstorageolocator.com', 'New Reservation'
    @body[:user]        = reserver
    @body[:reservation] = reservation
    @body[:comments]    = comments
  end
  
  def password_reset_instructions(user)
    setup_email user.email, 'diego@usselfstoragelocator.com', 'Password Reset Instructions'
    @body[:url] = edit_password_reset_url(user.perishable_token)
  end
  
  def review_request(recipient, message, listing, client)
    setup_email recipient, client.email, 'Please review my facility'
    @body[:message] = message
    @body[:listing] = listing
    @body[:client] = client
  end
  
  def tracking_request(listing, client, phone)
    setup_email 'diego@usselfstoragelocator.com', 'notifier@usselfstoragelocator.com', 'Call Tracking Request'
    @body[:listing] = listing
    @body[:client] = client
    @body[:phone] = phone
  end
  
  def setup_email(recipient, from, subject = '')
    @recipients = recipient
    @from       = from
    @subject    = subject
    @sent_on    = Time.now.utc
  end
  
end
