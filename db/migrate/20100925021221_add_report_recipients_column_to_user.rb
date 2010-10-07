class AddReportRecipientsColumnToUser < ActiveRecord::Migration
  def self.up
    add_column :users, :report_recipients, :text
  end

  def self.down
    remove_column :users, :report_recipients
  end
end
