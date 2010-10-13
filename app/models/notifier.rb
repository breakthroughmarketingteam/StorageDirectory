class Notifier < ActionMailer::Base
  default_url_options[:host] = RAILS_ENV == 'development' ? 'localhost:3000' : 'storagelocator.heroku.com'
  
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
  
  def client_notification(user)
    setup_email user.email, 'admin@usselfstoragelocator.com', 'Activate Your Account'
    @body[:user] = user
  end
  
  def tenant_confirmation(reserver, reservation)
    setup_email reserver.email, 'notifier@usselfstoragelocator.com', 'Self Storage Reservation'
    @body[:user]        = reserver
    @body[:reservation] = reservation
  end
  
  def admin_reservation_alert(reserver, reservation, comments)
    setup_email 'reservations@usselfstoragelocator.com', 'notifier@usselfstorageolocator.com', 'New Reservation'
    @body[:user]        = reserver
    @body[:reservation] = reservation
    @body[:comments]    = comments
  end
  
  def password_reset_instructions(user)
    setup_email user.email, 'admin@usselfstoragelocator.com', 'Password Reset Instructions'
    @body[:url] = edit_password_reset_url(user.perishable_token)
  end
  
  def setup_email(recipient, from, subject = '')
    @recipients = recipient
    @from       = from
    @subject    = subject
    @sent_on    = Time.now.utc
  end
  
end
