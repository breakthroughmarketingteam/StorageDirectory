class CreateUserStats < ActiveRecord::Migration
  def self.up
    create_table :user_stats do |t|
      t.integer :user_id
      t.string :user_agent
      t.text :request_uri
      t.text :referrer
      t.text :env

      t.timestamps
    end
  end

  def self.down
    drop_table :user_stats
  end
end
