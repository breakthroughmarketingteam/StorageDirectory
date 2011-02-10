module ActsAsCsv #:nodoc:

  def self.included(base)
    base.extend ClassMethods
  end

  module ClassMethods
    
    def acts_as_csv
      extend ActsAsCsv::SingletonMethods
    end
    
  end
  
  module SingletonMethods
    
    def to_csv
      load_csv_engine!
      
      @csv_engine.generate do |csv|
        headers = self.column_names
        csv << headers
        self.find_each do |model|
          headers.each do |field|
            csv << "\"#{model.send field}\""
          end
        end
      end
    end
    
    private
    
    def load_csv_engine!
      @csv_engine ||= begin
        require 'fastercsv'
        FasterCSV
      rescue MissingSourceFile
        require 'csv'
        CSV
      end
    end
    
  end
  
end
