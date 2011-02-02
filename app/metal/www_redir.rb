# Allow the metal piece to run in isolation
require(File.dirname(__FILE__) + "/../../config/environment") unless defined?(Rails)

class WwwRedir
  def self.call(env)
    host = env['HTTP_HOST']
    if host['www'] || host['secure']
      path = env['REQUEST_URI'].sub((env['REQUEST_URI']['www'] ? 'www.' : 'secure.'), '')
      [301, { 'Location' => path }, ['301 Permanent Redirect']]
    else
      [404, {'Content-Type' => 'text/html'}, ['Not Found']]
    end
  end
end