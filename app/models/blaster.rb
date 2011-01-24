class Blaster < ActionMailer::Base
  default_url_options[:host] = RAILS_ENV == 'development' ? 'localhost' : $root_domain
  
  def email_blast(recipient, email_blast, content, sender = 'info@usselfselfstoragelocator.com')
    setup_email recipient, sender, email_blast.title
    content_type 'text/html'
    
    @body[:content] = content
  end
  
  def html_email(recipient, subject, content, sender = 'admin@usselfselfstoragelocator.com')
    setup_email recipient, sender, subject
    content_type 'text/html'
    
    @body[:content] = content
  end
  
  def setup_email(recipient, from, subject = '')
    @recipients = recipient
    @from       = "USSelfStorageLocator <#{from}>"
    @subject    = subject
    @sent_on    = Time.now.utc
  end
  
end
