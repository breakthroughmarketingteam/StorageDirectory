class AddIndeces < ActiveRecord::Migration
  def self.up
    add_index :billing_infos, [:client_id, :name, :card_expiration]
    add_index :block_forms, [:block_id, :form_id]
    add_index :blocks, [:id, :title, :show_in_all, :restful_region]
    add_index :blocks_models, [:block_id, :model_id, :model_type]
    add_index :comments, [:title, :commentable_id, :user_id]
    add_index :forms, [:id, :name]
    add_index :galleries, [:id, :title]
    add_index :gallery_images, [:gallery_id, :image_id]
    add_index :images, [:id, :user_id, :title]
    add_index :listings, [:id, :user_id, :title]
    add_index :listing_sizes, [:listing_id, :size_id]
    add_index :mailing_addresses, [:client_id, :name, :city, :state]
    add_index :maps, [:listing_id, :city, :zip, :lat, :lng]
    add_index :models_modules, [:model_id, :model_type]
    add_index :models_views, [:model_id, :view_id, :model_type]
    add_index :pages, [:id, :title, :parent_id, :show_in_nav]
    add_index :permissions, [:id, :role_id]
    add_index :pictures, [:id, :listing_id, :title]
    add_index :posts, [:id, :user_id, :published]
    add_index :sizes, [:listing_id, :price]
    add_index :specials, [:listing_id, :title]
    add_index :tags, [:name]
    add_index :us_cities, [:state, :name]
    add_index :user_hint_placements, [:user_id]
    add_index :users, [:id, :email, :type, :company]
  end

  def self.down
  end
end
