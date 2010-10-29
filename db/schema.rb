# This file is auto-generated from the current state of the database. Instead of editing this file, 
# please use the migrations feature of Active Record to incrementally modify your database, and
# then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your database schema. If you need
# to create the application database on another system, you should be using db:schema:load, not running
# all the migrations from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended to check this file into your version control system.

ActiveRecord::Schema.define(:version => 20101029195110) do

  create_table "account_settings", :force => true do |t|
    t.integer  "client_id"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.text     "reports_recipients"
    t.text     "virtuabutes"
  end

  create_table "billing_infos", :force => true do |t|
    t.integer  "client_id"
    t.string   "name"
    t.string   "address"
    t.string   "phone"
    t.string   "card_type"
    t.string   "card_number"
    t.integer  "expires_month"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "city"
    t.string   "state"
    t.integer  "zip"
    t.integer  "ccv"
    t.integer  "expires_year"
  end

  add_index "billing_infos", ["client_id", "name", "expires_month"], :name => "index_billing_infos_on_client_id_and_name_and_card_expiration"

  create_table "block_forms", :force => true do |t|
    t.integer  "block_id"
    t.integer  "form_id"
    t.boolean  "enabled"
    t.integer  "position"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_index "block_forms", ["block_id", "form_id"], :name => "index_block_forms_on_block_id_and_form_id"

  create_table "blocks", :force => true do |t|
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "title"
    t.text     "description"
    t.text     "content"
    t.boolean  "show_title"
    t.string   "show_in_all"
    t.integer  "position",         :default => 0
    t.boolean  "process_erb"
    t.boolean  "use_placeholders"
    t.boolean  "restful"
    t.string   "controller"
    t.string   "action"
    t.string   "restful_region"
  end

  add_index "blocks", ["id", "title", "show_in_all", "restful_region"], :name => "index_blocks_on_id_and_title_and_show_in_all_and_restful_region"

  create_table "blocks_models", :force => true do |t|
    t.integer  "model_id"
    t.string   "model_type"
    t.integer  "block_id"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "place"
    t.boolean  "enabled"
    t.boolean  "show_title"
    t.integer  "position",   :default => 0
  end

  add_index "blocks_models", ["block_id", "model_id", "model_type"], :name => "index_blocks_models_on_block_id_and_model_id_and_model_type"

  create_table "business_hours", :force => true do |t|
    t.string   "day"
    t.string   "opening_time"
    t.string   "closing_time"
    t.boolean  "closed"
    t.integer  "listing_id"
    t.string   "hours_type"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "clicks", :force => true do |t|
    t.integer  "listing_id"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "referrer"
    t.string   "request_uri"
  end

  create_table "comments", :force => true do |t|
    t.string   "title",            :limit => 50
    t.string   "comment"
    t.datetime "created_at",                                    :null => false
    t.integer  "commentable_id",                 :default => 0, :null => false
    t.string   "commentable_type", :limit => 15,                :null => false
    t.integer  "user_id",                        :default => 0, :null => false
    t.string   "email"
  end

  add_index "comments", ["title", "commentable_id", "user_id"], :name => "index_comments_on_title_and_commentable_id_and_user_id"
  add_index "comments", ["user_id"], :name => "fk_comments_user"

  create_table "facility_features", :force => true do |t|
    t.integer  "standard_id"
    t.integer  "listing_id"
    t.string   "title"
    t.text     "description"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "facility_infos", :force => true do |t|
    t.string   "O_FacilityName"
    t.string   "O_FacilityId"
    t.integer  "O_ISSNID"
    t.boolean  "O_WebReservationsAllowed"
    t.boolean  "O_WebRentalsAllowed"
    t.string   "O_Address"
    t.string   "O_Address2"
    t.string   "O_City"
    t.string   "O_StateOrProvince"
    t.integer  "O_PostalCode"
    t.float    "O_IssnLongitude"
    t.float    "O_IssnLatitude"
    t.boolean  "O_AcceptVisa"
    t.boolean  "O_AcceptMC"
    t.boolean  "O_AcceptAmex"
    t.boolean  "O_AcceptDiscover"
    t.integer  "O_MaximumReserveAheadDays"
    t.string   "O_PMS"
    t.integer  "O_ReservationFee_Min"
    t.integer  "O_ReservationFee_Max"
    t.integer  "O_ReservationOverrideFee"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.integer  "listing_id"
    t.string   "UsersFacilityExternalID"
    t.string   "MS_Name"
    t.string   "MS_Phone"
    t.text     "MS_Description"
    t.string   "MS_Fax"
    t.string   "MS_Address1"
    t.string   "MS_State"
    t.string   "MS_Address2"
    t.integer  "MS_Postal"
    t.string   "MS_City"
    t.string   "MS_WebSite"
  end

  create_table "facility_insurances", :force => true do |t|
    t.integer  "listing_id"
    t.string   "sID"
    t.string   "Provider"
    t.string   "TheftCoverage"
    t.integer  "MonthlyPremium"
    t.integer  "CoverageAmount"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "facility_units", :force => true do |t|
    t.integer  "unit_type_id"
    t.string   "UnitID"
    t.string   "UnitName"
    t.string   "Available"
    t.string   "PromosAvailable"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "ErrorMessage"
  end

  create_table "features", :force => true do |t|
    t.integer  "unit_type_id"
    t.string   "ErrorMessage"
    t.string   "sID"
    t.string   "StdUnitTypesFeaturesShortDescription"
    t.float    "Fee"
    t.string   "KnowOfFee"
    t.string   "StdUnitTypesFeaturesId"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "fields", :force => true do |t|
    t.string   "field_type"
    t.text     "field_attributes"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.integer  "form_id"
    t.boolean  "use_own_name"
    t.integer  "position",         :default => 0
  end

  create_table "forms", :force => true do |t|
    t.string   "name"
    t.text     "description"
    t.string   "controller"
    t.string   "action"
    t.boolean  "enabled"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "scope"
    t.integer  "target_id"
    t.boolean  "send_email"
    t.string   "recipient"
    t.boolean  "use_reverse_captcha"
    t.boolean  "show_title"
  end

  add_index "forms", ["id", "name"], :name => "index_forms_on_id_and_name"

  create_table "galleries", :force => true do |t|
    t.string   "title"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.text     "description"
  end

  add_index "galleries", ["id", "title"], :name => "index_galleries_on_id_and_title"

  create_table "gallery_images", :force => true do |t|
    t.integer  "gallery_id"
    t.integer  "image_id"
    t.integer  "order"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_index "gallery_images", ["gallery_id", "image_id"], :name => "index_gallery_images_on_gallery_id_and_image_id"

  create_table "groups", :force => true do |t|
    t.string   "name"
    t.text     "description"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "helptexts", :force => true do |t|
    t.string   "model"
    t.text     "text"
    t.text     "examples"
    t.boolean  "show"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "images", :force => true do |t|
    t.string   "title"
    t.string   "image_file_name"
    t.string   "image_content_type"
    t.integer  "image_file_size"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.integer  "user_id"
    t.text     "description"
    t.text     "content"
  end

  add_index "images", ["id", "user_id", "title"], :name => "index_images_on_id_and_user_id_and_title"

  create_table "impressions", :force => true do |t|
    t.integer  "listing_id"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "referrer"
    t.string   "request_uri"
  end

  create_table "info_requests", :force => true do |t|
    t.integer  "listing_id"
    t.string   "name"
    t.string   "email"
    t.string   "phone"
    t.string   "duration"
    t.string   "unit_type_size"
    t.string   "status"
    t.datetime "move_in_date"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.integer  "size_id"
  end

  create_table "issn_facility_features", :force => true do |t|
    t.string   "MappingCodes"
    t.string   "sID"
    t.text     "LongDescription"
    t.string   "ShortDescription"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "issn_facility_unit_features", :force => true do |t|
    t.integer  "listing_id"
    t.integer  "unit_type_id"
    t.string   "sID"
    t.text     "StdUnitTypesFeaturesShortDescription"
    t.string   "KnowOfFee"
    t.integer  "Fee"
    t.string   "StdUnitTypesFeaturesId"
    t.text     "ErrorMessage"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "issn_unit_type_features", :force => true do |t|
    t.string   "MappingCodes"
    t.string   "sID"
    t.string   "Abbreviation"
    t.text     "LongDescription"
    t.string   "ShortDescription"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "issn_unit_type_sizes", :force => true do |t|
    t.string   "Description"
    t.integer  "SQFT"
    t.string   "sID"
    t.integer  "Length"
    t.integer  "Width"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "links", :force => true do |t|
    t.string   "title"
    t.string   "path"
    t.boolean  "relative"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.integer  "group_id"
    t.string   "resource"
    t.integer  "target_id"
  end

  create_table "listing_contacts", :force => true do |t|
    t.string   "title"
    t.string   "first_name"
    t.string   "last_name"
    t.string   "phone"
    t.string   "web_address"
    t.string   "sic_description"
    t.integer  "listing_id"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "listing_descriptions", :force => true do |t|
    t.text     "description"
    t.string   "show_in"
    t.integer  "client_id"
    t.integer  "listing_id"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "listings", :force => true do |t|
    t.string   "title"
    t.text     "description"
    t.boolean  "enabled"
    t.integer  "user_id"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "status"
    t.integer  "clicks_count",        :default => 0
    t.integer  "impressions_count",   :default => 0
    t.integer  "reservations_count",  :default => 0
    t.boolean  "office_24_hours"
    t.boolean  "access_24_hours"
    t.integer  "info_requests_count", :default => 0
    t.string   "logo_file_name"
    t.integer  "logo_file_size"
    t.string   "logo_content_type"
    t.integer  "default_logo"
  end

  add_index "listings", ["id", "user_id", "title"], :name => "index_listings_on_id_and_user_id_and_title"

  create_table "mailing_addresses", :force => true do |t|
    t.integer  "user_id"
    t.string   "name"
    t.string   "company"
    t.string   "address"
    t.string   "phone"
    t.string   "email"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "city"
    t.string   "state"
    t.string   "zip"
  end

  add_index "mailing_addresses", ["user_id", "city", "state"], :name => "index_mailing_addresses_on_client_id_and_city_and_state"

  create_table "maps", :force => true do |t|
    t.integer  "listing_id"
    t.string   "address"
    t.string   "city"
    t.string   "state"
    t.integer  "zip"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "phone"
    t.float    "lat"
    t.float    "lng"
  end

  add_index "maps", ["listing_id", "city", "zip", "lat", "lng"], :name => "index_maps_on_listing_id_and_city_and_zip_and_lat_and_lng"

  create_table "models_views", :force => true do |t|
    t.integer  "view_id"
    t.integer  "model_id"
    t.string   "model_type"
    t.string   "order"
    t.integer  "position"
    t.integer  "limit"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "view_type"
    t.text     "fields"
    t.boolean  "enabled"
    t.string   "conditions"
    t.boolean  "paginate"
  end

  add_index "models_views", ["model_id", "view_id", "model_type"], :name => "index_models_views_on_model_id_and_view_id_and_model_type"

  create_table "move_in_costs", :force => true do |t|
    t.integer  "unit_type_id"
    t.string   "Description"
    t.float    "Amount"
    t.string   "Name"
    t.float    "Tax"
    t.text     "ErrorMessage"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "pages", :force => true do |t|
    t.string   "title"
    t.integer  "parent_id"
    t.string   "url"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.boolean  "show_in_nav"
    t.text     "content"
    t.text     "description"
    t.boolean  "show_title"
    t.integer  "position",         :default => 0
    t.boolean  "process_erb"
    t.boolean  "use_placeholders"
  end

  add_index "pages", ["id", "title", "parent_id", "show_in_nav"], :name => "index_pages_on_id_and_title_and_parent_id_and_show_in_nav"

  create_table "payments", :force => true do |t|
    t.integer  "amount"
    t.string   "transaction_type"
    t.string   "occurrence_type"
    t.integer  "occurrence_number"
    t.integer  "user_id"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_index "payments", ["user_id"], :name => "index_payments_on_user_id"

  create_table "permissions", :force => true do |t|
    t.string   "resource"
    t.string   "action"
    t.boolean  "scoped"
    t.integer  "role_id"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_index "permissions", ["id", "role_id"], :name => "index_permissions_on_id_and_role_id"

  create_table "pictures", :force => true do |t|
    t.integer  "listing_id"
    t.string   "title"
    t.text     "description"
    t.integer  "position",                    :default => 0
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "facility_image_file_name"
    t.string   "facility_image_content_type"
    t.integer  "facility_image_file_size"
  end

  add_index "pictures", ["id", "listing_id", "title"], :name => "index_pictures_on_id_and_listing_id_and_title"

  create_table "posts", :force => true do |t|
    t.string   "title"
    t.text     "content"
    t.integer  "user_id"
    t.boolean  "published"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.integer  "comments_count",   :default => 0
    t.boolean  "comments_enabled"
    t.integer  "position",         :default => 0
  end

  add_index "posts", ["id", "user_id", "published"], :name => "index_posts_on_id_and_user_id_and_published"

  create_table "promos", :force => true do |t|
    t.integer  "special_id"
    t.text     "Description"
    t.string   "sID"
    t.string   "UseAtCounter"
    t.string   "Code"
    t.string   "UseAtWeb"
    t.string   "UseAtKiosk"
    t.datetime "LastTimeUpdated"
    t.string   "CouponCode"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.integer  "listing_id"
  end

  create_table "rates", :force => true do |t|
    t.integer  "rater_id"
    t.integer  "rateable_id"
    t.string   "rateable_type"
    t.integer  "stars",         :null => false
    t.string   "dimension"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_index "rates", ["rateable_id", "rateable_type"], :name => "index_rates_on_rateable_id_and_rateable_type"
  add_index "rates", ["rater_id"], :name => "index_rates_on_rater_id"

  create_table "reservations", :force => true do |t|
    t.integer  "listing_id"
    t.integer  "reserver_id"
    t.string   "status"
    t.datetime "move_in_date"
    t.datetime "move_out_date"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "referrer"
    t.integer  "size_id"
    t.string   "reserve_code"
    t.text     "response"
    t.string   "duration"
    t.string   "unit_type_size"
  end

  create_table "reserve_costs", :force => true do |t|
    t.integer  "unit_type_id"
    t.integer  "LastDayYMD"
    t.float    "FeeAmount"
    t.string   "Available"
    t.string   "ManagementSystem_TID"
    t.integer  "ManagementSystem_UID"
    t.float    "Tax"
    t.float    "ReservationFeeMax"
    t.integer  "DetailCount"
    t.string   "FeeIncludesTax"
    t.float    "ReservationFeeMin"
    t.string   "ManagementSystem_TypeDesc"
    t.string   "LastDayMDY"
    t.string   "ManagementSystem_UnitName"
    t.string   "FeeDescription"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "roles", :force => true do |t|
    t.string   "title"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "searches", :force => true do |t|
    t.string   "query"
    t.string   "unit_size"
    t.string   "storage_type"
    t.string   "features"
    t.integer  "within"
    t.string   "referrer"
    t.string   "remote_ip"
    t.float    "lat"
    t.float    "lng"
    t.string   "city"
    t.string   "state"
    t.integer  "zip"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.integer  "listing_id"
    t.integer  "parent_id"
    t.integer  "lft"
    t.integer  "rgt"
  end

  create_table "size_icons", :force => true do |t|
    t.string   "title"
    t.text     "description"
    t.integer  "width"
    t.integer  "length"
    t.string   "icon_size"
    t.string   "icon_file_name"
    t.integer  "icon_file_size"
    t.string   "icon_content_type"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "sizes", :force => true do |t|
    t.string   "title"
    t.integer  "width"
    t.integer  "length"
    t.string   "unit"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "description"
    t.integer  "price"
    t.integer  "listing_id"
  end

  add_index "sizes", ["listing_id", "price"], :name => "index_sizes_on_listing_id_and_price"

  create_table "specials", :force => true do |t|
    t.integer  "listing_id"
    t.string   "title"
    t.string   "description"
    t.string   "content"
    t.string   "code"
    t.boolean  "enabled"
    t.integer  "position",    :default => 0
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_index "specials", ["listing_id", "title"], :name => "index_specials_on_listing_id_and_title"

  create_table "taggings", :force => true do |t|
    t.integer  "tag_id"
    t.integer  "taggable_id"
    t.integer  "tagger_id"
    t.string   "tagger_type"
    t.string   "taggable_type"
    t.string   "context"
    t.datetime "created_at"
  end

  add_index "taggings", ["context", "taggable_id", "taggable_type"], :name => "index_taggings_on_taggable_id_and_taggable_type_and_context"
  add_index "taggings", ["tag_id"], :name => "index_taggings_on_tag_id"

  create_table "tags", :force => true do |t|
    t.string "name"
  end

  add_index "tags", ["name"], :name => "index_tags_on_name"

  create_table "unit_types", :force => true do |t|
    t.integer  "listing_id"
    t.datetime "LastTimeUpdateTried"
    t.string   "ManagementSystemsId"
    t.string   "StorageSvrDescription"
    t.text     "CustomDescription"
    t.string   "sID"
    t.float    "RentalRate"
    t.float    "ReservationFeeMax"
    t.string   "StdUnitTypeSizesDescription"
    t.string   "ManagementSystemsDescription"
    t.string   "ReservationOverrideFee"
    t.integer  "StopAvailableToRentWhenBelow"
    t.integer  "ActualSQFT"
    t.text     "SpecialComments"
    t.datetime "LastTimeUpdated"
    t.integer  "ActualWidth"
    t.float    "ReservationFeeMin"
    t.boolean  "InsuranceRequired"
    t.string   "StdUnitTypeSizesId"
    t.integer  "QuantityAtFacility"
    t.string   "QuantityAvailableToRent"
    t.integer  "ActualLength"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.integer  "size_id"
  end

  add_index "unit_types", ["listing_id"], :name => "index_unit_types_on_listing_id"

  create_table "us_cities", :force => true do |t|
    t.string   "state"
    t.string   "name"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_index "us_cities", ["name"], :name => "index_us_cities_on_name"
  add_index "us_cities", ["state", "name"], :name => "index_us_cities_on_state_and_name"
  add_index "us_cities", ["state"], :name => "index_us_cities_on_state"

  create_table "user_hint_placements", :force => true do |t|
    t.boolean  "hide"
    t.integer  "position",     :default => 0
    t.integer  "user_id"
    t.integer  "user_hint_id"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_index "user_hint_placements", ["user_id"], :name => "index_user_hint_placements_on_user_id"

  create_table "user_hints", :force => true do |t|
    t.string   "title"
    t.text     "description"
    t.text     "content"
    t.string   "place"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "users", :force => true do |t|
    t.string   "first_name"
    t.string   "email"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "crypted_password"
    t.string   "password_salt"
    t.string   "persistence_token"
    t.integer  "login_count"
    t.integer  "failed_login_count"
    t.datetime "last_request_at"
    t.datetime "current_login_at"
    t.datetime "last_login_at"
    t.string   "current_login_ip"
    t.string   "last_login_ip"
    t.integer  "facebook_uid",       :limit => 8
    t.integer  "role_id"
    t.string   "type"
    t.string   "company"
    t.boolean  "wants_newsletter"
    t.string   "activation_code"
    t.string   "status"
    t.string   "temp_password"
    t.string   "last_name"
    t.string   "perishable_token",                :null => false
    t.text     "report_recipients"
  end

  add_index "users", ["id", "email", "type", "company"], :name => "index_users_on_id_and_email_and_type_and_company"
  add_index "users", ["perishable_token"], :name => "index_users_on_perishable_token"

  create_table "views", :force => true do |t|
    t.string   "table_catalog"
    t.string   "table_schema"
    t.string   "model_name"
    t.string   "table_name"
    t.string   "name"
    t.string   "view_definition"
    t.text     "description"
    t.datetime "created_at"
    t.string   "check_option"
    t.datetime "updated_at"
    t.string   "is_updatable"
    t.string   "is_insertable_into"
    t.string   "scope"
    t.integer  "owner_id"
  end

  create_table "web_specials", :force => true do |t|
    t.string   "label"
    t.string   "title"
    t.text     "description"
    t.string   "coupon_code"
    t.integer  "value"
    t.string   "function"
    t.integer  "listing_id"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

end
