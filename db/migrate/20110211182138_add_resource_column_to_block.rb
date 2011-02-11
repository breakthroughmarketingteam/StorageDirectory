class AddResourceColumnToBlock < ActiveRecord::Migration
  def self.up
    add_column :blocks, :resource, :string
    
    blocks = Block.find_all_by_restful true
    totes = blocks.size
    puts "About to convert #{totes} blocks."
    
    Block.transaction do
      blocks.each_with_index do |block, i|
        controllers = block.controller.split(/,\s?/).map
        resource_str = controllers.map { |c| "#{c}[#{block.action}]"}.join ', '
        block.update_attribute :resource, resource_str
        puts "-----> (#{sprintf("%.2f", ((i + 1).to_f / totes.to_f * 100))}% done) Converted block #{block.title}, has #{resource_str}"
      end
    end
    
    puts "All done captain!"
  end

  def self.down
    remove_column :blocks, :resource
  end
end
