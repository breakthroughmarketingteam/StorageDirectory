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
        csv << self.column_names
        self.find_each { |model| csv << model.attributes.values.map { |v| "\"#{v}\"" } }
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
