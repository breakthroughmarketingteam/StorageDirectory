class Blaster < ActionMailer::Base
  default_url_options[:host] = RAILS_ENV == 'development' ? 'localhost:3000' : $root_domain
  
  def email_blast(recipient, email_blast, content)
    setup_email recipient, 'info@usselfselfstoragelocator.com', email_blast.title
    content_type 'text/html'
    
    @body[:content] = content
  end
  
  def setup_email(recipient, from, subject = '')
    @recipients = "Self Storage Specials <#{recipient}>"
    @from       = from
    @subject    = subject
    @sent_on    = Time.now.utc
  end
  
end
