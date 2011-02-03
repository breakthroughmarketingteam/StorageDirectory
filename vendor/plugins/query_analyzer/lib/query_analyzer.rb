=begin OLD CODE
class Array
  protected
    def qa_columnized_row(fields, sized)
      row = []
      fields.each_with_index do |f, i|
        row << sprintf("%0-#{sized[i]}s", f.to_s)
      end
      row.join(' | ')
    end

  public

  def qa_columnized
    sized = {}
    self.each do |row|
      row.values.each_with_index do |value, i|
        sized[i] = [sized[i].to_i, row.keys[i].length, value.to_s.length].max
      end
    end

    table = []
    table << qa_columnized_row(self.first.keys, sized)
    table << '-' * table.first.length
    self.each { |row| table << qa_columnized_row(row.values, sized) }
    table.join("\n   ") # Spaces added to work with format_log_entry
  end
end



module ActiveRecord
  module ConnectionAdapters
    
    class MysqlAdapter < AbstractAdapter
      private
        alias_method :select_without_analyzer, :select
        
        def select(sql, name = nil)
          query_results = select_without_analyzer(sql, name)
          
          if @logger and @logger.level <= Logger::INFO
            @logger.debug(
              @logger.silence do
                format_log_entry("Analyzing #{name}\n",
                  "#{select_without_analyzer("explain #{sql}", name).qa_columnized}\n"
                )
              end
            ) if sql =~ /^select/i
          end          
          query_results
        end
    end

  end
end
=end

# NEW CODE
#
# Query Analyzer
#
#
# Original MySQL plugin:
# http://github.com/jeberly/query-analyzer
#
# PostgreSQL/Oracle Adapter by:
# http://spazidigitali.com/2006/12/01/rails-query-analyzer-plugin-now-also-on-oracle-and-postgresql/
#
# Usage:
#
#    config.gem "query_analyzer"
#
#
$:.unshift(File.dirname(__FILE__)) unless
  $:.include?(File.dirname(__FILE__)) || $:.include?(File.expand_path(File.dirname(__FILE__)))

module QueryAnalyzer
  VERSION = '0.1.7'
end

module CommonAnalyzer
  @@analyzer_debug = 0..2
  @@analyzer_warn  = 3..7

  def select_logger time_spent, log
    case time_spent
    when @@analyzer_debug then @logger.debug(log)
    when @@analyzer_warn  then @logger.warn(log)
    else @logger.fatal(log)
    end
  end
end

class Array
  protected
    def qa_columnized_row(fields, sized)
      row = []
      fields.each_with_index do |f, i|
        row << sprintf("%0-#{sized[i]}s", f.to_s)
      end
      row.join(' | ')
    end

  public

  def qa_columnized
    sized = {}
    self.each do |row|
      row.values.each_with_index do |value, i|
        sized[i] = [sized[i].to_i, row.keys[i].length, value.to_s.length].max
      end
    end

    table = []
    table << qa_columnized_row(self.first ? self.first.keys : "No Analysis Information", sized)
    table << '-' * table.first.length
    self.each { |row| table << qa_columnized_row(row.values, sized) }
    table.join("\n   ") # Spaces added to work with format_log_entry
  end

  def qa_pgrows
    self.map(&:values).join("\n ")
  end

end

#
# Connection Adapters
#
module ActiveRecord
  module ConnectionAdapters
    #
    # PostgreSQL
    #
    class PostgreSQLAdapter < AbstractAdapter
      include CommonAnalyzer

      # if true then uses the ANALYZE option which (from postgresql manual):
      #Carry out the command and show the actual run times.
      cattr_accessor :explain_analyze
      @@explain_analyze = nil

      #if true then uses the VERBOSE option which  (from postgresql manual):
      #Shows the full internal representation of the plan tree,
      #rather than just a summary. Usually this option is only
      #useful for specialized debugging purposes.
      #The VERBOSE output is either pretty-printed or not,
      #depending on the setting of the explain_pretty_print
      #configuration parameter.
      cattr_accessor :explain_verbose
      @@explain_verbose = nil

      private

      alias_method :select_without_analyzer, :select

      def select(sql, name = nil)
        start_time = Time.now
        query_results = select_without_analyzer(sql, name)
        spent = Time.now - start_time

        if @logger and @logger.level <= Logger::INFO
          select_logger(@spent, @logger.silence do
            format_log_entry("Analyzing #{name} Execution Time: #{spent}\n\n",
              "#{select_without_analyzer("explain #{'analyze' if @@explain_analyze} "+
              "#{'verbose' if @@explain_verbose} #{sql}", name).qa_pgrows}\n")
          end) if sql =~ /^select/i
        end
        query_results
      end
    end
  end
end