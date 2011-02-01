# Allow the metal piece to run in isolation
require(File.dirname(__FILE__) + "/../../config/environment") unless defined?(Rails)

class WwwRedir
  def self.call(env)
    raise env.pretty_inspect
    host = env['HTTP_HOST']
    
    if host['www'] || host['secure']
      [301, { 'Location' => request.url.sub('//www.', '//')}, ['301 Permanent Redirect']]
    else
      [404, {'Content-Type' => 'text/html'}, ['Not Found']]
    end
  end
end