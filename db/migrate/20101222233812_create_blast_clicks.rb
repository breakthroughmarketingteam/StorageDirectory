class CreateBlastClicks < ActiveRecord::Migration
  def self.up
    create_table :blast_clicks do |t|
      t.integer :blast_id
      t.text :referrer
      t.string :remote_ip

      t.timestamps
    end
  end

  def self.down
    drop_table :blast_clicks
  end
end
