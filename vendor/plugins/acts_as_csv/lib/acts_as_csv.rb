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
    
    def to_csv(options = {})
      load_csv_engine!
      
      @csv_engine.generate do |csv|
        headers = self.respond_to?(:exportables) ? self.exportables : self.column_names.sort
        csv << headers
        self.all(options).each do |model|
          csv << headers.map { |name| model.send name }
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
