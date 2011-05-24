class ClientNotifier < ActionMailer::Base
  default_url_options[:host] = RAILS_ENV == 'development' ? 'localhost' : 'usselfstoragelocator.com'
  layout 'email_templates/premium_client'
  
  def trial_ends_notification(client)
    setup_email client.email, 'USSSL Notifier <notifier@usselfstoragelocator.com>', 'Your Premium Trial Ends Soon'
    @body[:days] = @days = '15 Days'
    @body[:client] = client
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