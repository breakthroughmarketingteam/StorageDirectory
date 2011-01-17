class AddTypesToPost < ActiveRecord::Migration
  def self.up
    Post.find_each do |post|
      post.update_attribute :type, post.class.name
    end
  end

  def self.down
  end
end
