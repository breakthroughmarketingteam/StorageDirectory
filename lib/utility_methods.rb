module UtilityMethods
  
  # add methods to Ruby classes
  String.class_eval do

    PLURALS = [['(quiz)$', '\1zes'],['(ox)$', '\1en'],['([m|l])ouse$', '\1ice'],['(matr|vert|ind)ix|ex$', '\1ices'],
      ['(x|ch|ss|sh)$', '\1es'],['([^aeiouy]|qu)ies$', '\1y'],['([^aeiouy]|q)y$$', '\1ies'],['(hive)$', '\1s'],
      ['(?:[^f]fe|([lr])f)$', '\1\2ves'],['(sis)$', 'ses'],['([ti])um$', '\1a'],['(buffal|tomat)o$', '\1oes'],['(bu)s$', '\1es'],
      ['(alias|status)$', '\1es'],['(octop|vir)us$', '\1i'],['(ax|test)is$', '\1es'],['s$', 's'],['$', 's']]
      
    SINGULARS =[['(quiz)zes$', '\1'],['(matr)ices$', '\1ix'],['(vert|ind)ices$', '\1ex'],['^(ox)en$', '\1'],['(alias|status)es$', '\1'],
      ['(octop|vir)i$', '\1us'],['(cris|ax|test)es$', '\1is'],['(shoe)s$', '\1'],['[o]es$', '\1'],['[bus]es$', '\1'],['([m|l])ice$', '\1ouse'],
      ['(x|ch|ss|sh)es$', '\1'],['(m)ovies$', '\1ovie'],['[s]eries$', '\1eries'],['([^aeiouy]|qu)ies$', '\1y'],['[lr]ves$', '\1f'],
      ['(tive)s$', '\1'],['(hive)s$', '\1'],['([^f]ves$', '\1fe'],['(^analy)ses$', '\1sis'],
      ['([a]naly|[b]a|[d]iagno|[p]arenthe|[p]rogno|[s]ynop|[t]he)ses$', '\1\2sis'],['([ti])a$', '\1um'],['(news)$', '\1ews'],['s{1}$', '']]

    def singular()
      SINGULARS.each { |match_exp, replacement_exp| return gsub(Regexp.compile(match_exp), replacement_exp) unless match(Regexp.compile(match_exp)).nil?}
    rescue
      self.sub(/s$/, '').sub(/ie$/, 'y')
    end

    def plural()
      PLURALS.each { |match_exp, replacement_exp| return gsub(Regexp.compile(match_exp), replacement_exp) unless match(Regexp.compile(match_exp)).nil? }
    end

    def plural?
      PLURALS.each {|match_exp, replacement_exp| return true if match(Regexp.compile(match_exp))}
      false
    end
    
    # (monkey patch) get rid of apostrophes in string
    def parameterize
      gsub("\'", '')
      super
    end
    
    # More custom methods
    def possessive
      match(/s$/i) ? "#{self}'" : "#{self}'s"
    end
    
    # add a or an before the word. 
    # does not do it correctly, really depends on if a word starts with a vowel sound, rather than the actual letter as written
    def indef_article
      %w(a e i o u).include?(self[0, 1].downcase) ? "an #{self}" : "a #{self}"
    end
    
    def to_class
      self.camelcase.constantize
    end

    def truncate(limit = 200, trailing_dots = true)
      return self if self.size <= limit
      self[0, limit] + (trailing_dots ? '...' : '')
    end

    def stripped_teaser(count = 100)
      return if self.blank?
      
      string = self.gsub(/<.*[^>]*>/i, ''); #replace html tags with nothing
  	  shortened = string[0, count]
  	  splitted = shortened.split(/\s/)
  	  words = splitted.length
      
  	  # use only first paragraph if short enough
  	  paragraph = shortened[/<p\b[^>]*>(.*?)<\/p>/]
  	  unless paragraph.blank?
  	    string = paragraph[3,(paragraph.length-7)]  # remove <p> tags
  	  else
  	    string.length <= count ? string : (splitted[0, words-1] || []).join(" ") + ' ...'
      end
    end
    
    def to_phone # 555-555-5555
      return self unless self['-'].blank?
      "#{self[0,3]}-#{self[3,3]}-#{self[6,6]}"
    end

  end

  class Hash
    def except(*keys)
      new_hash = {}
      self.each_pair { |key, val| new_hash.store key, val unless keys.include? key  }
      new_hash
    end
  end
  
  class Array
    def sum_all
      inject(0.0) { |result, el| result + el }
    end

    def mean 
      sum_all / size
    end
  end
  
  def benchmark(title = "#{controller_name}##{action_name}")
    cur = Time.now
    result = yield
    out = "BENCHMARK (#{title}): #{cur = Time.now - cur} seconds"
    out << "\n(#{(cur / $last_benchmark * 100).to_i - 100}% change)\n" rescue ""
    mylogger out
    $last_benchmark = cur
    result
  end
  
  def mylogger(text)
    return
    puts "\n********************************************************************************* MY LOGGER **************************************************************************************\n"
    puts "-----> #{text}\n"
    puts "**********************************************************************************************************************************************************************************\n"
  end
  
end