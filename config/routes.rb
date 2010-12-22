ActionController::Routing::Routes.draw do |map|
  # The priority is based upon order of creation: first created -> highest priority.

  # Sample of regular route:
  #   map.connect 'products/:id', :controller => 'catalog', :action => 'view'
  # Keep in mind you can assign values other than :controller and :action

  # Sample of named route:
  #   map.purchase 'products/:id/purchase', :controller => 'catalog', :action => 'purchase'
  # This route can be invoked with purchase_url(:id => product.id)
  
  # restful pages that replace pages from the Page model by overwriting the title, this allows us to manage a nav pages position, but the url takes you to a restful action
  map.new_client '/add-your-facility', :controller => 'clients', :action => 'new', :title => 'add-your-facility'
  
  map.client_account '/my_account', :controller => 'clients', :action => 'edit'
  map.client_listing '/my_account/listings/:id', :controller => 'listings', :action => 'edit'
  map.admin_to_client '/clients/:id/account', :controller => 'clients', :action => 'edit'
  
  map.login  '/login',  :controller => 'user_sessions', :action => 'new'
  map.signup '/signup', :controller => 'users',         :action => 'new'
  map.logout '/logout', :controller => 'user_sessions', :action => 'destroy'
  
  # clean paths for searches
  map.search_form '/self-storage/:auto_search', :controller => 'listings', :action => 'locator', :requirements => { :auto_search => /(auto_search)/ }
  map.facility '/:storage_type/:title/:id', :controller => 'listings', :action => 'show', :requirements => { :id => /\d+/ }
  
  # for building routes
  $_storage_types = ['Self', 'Mobile', 'Cold', 'Vehicle', 'Car', 'Boat', 'RV'].map { |t| "#{t} Storage" }
  $_storage_types.each do |type|
    eval "map.#{type.gsub(' ', '_').downcase}_home '/#{type.parameterize}', :controller => 'listings', :action => 'home', :storage_type => '#{type}'"
    eval "map.#{type.gsub(' ', '_').downcase} '/#{type.parameterize}/:state/:city/:zip', :controller => 'listings', :action => 'locator', :zip => nil, :storage_type => '#{type}'"
  end
  
  map.truck_rentals '/truck-rentals', :controller => 'listings', :action => 'locator', :storage_type => 'Truck'
  map.moving_companies '/moving-companies', :controller => 'listings', :action => 'locator', :storage_type => 'Moving'
  
  map.client_activate '/clients/activate/:code', :controller => 'clients', :action => 'activate'
  map.tenant_activate '/tenants/activate/:code', :controller => 'tenants', :action => 'activate'
  map.resend_activation '/resend_activation/:code', :controller => 'clients', :action => 'resend_activation'
  map.toggle_facility_feature '/clients/:client_id/listings/:listing_id/facility_features/:title/:status', :controller => 'facility_features', :action => 'update'
  map.map_dirs '/directions/:from/:to', :controller => 'ajax', :action => 'dirs'
  
  map.create_tip '/create_tip', :controller => 'posts', :action => 'create', :for => 'tip'
  map.tip '/tips/:id', :controller => 'posts', :action => 'show'
  
  # Sample resource route with options:
  #   map.resources :products, :member => { :short => :get, :toggle => :post }, :collection => { :sold => :get }
  
  # Sample resource route with sub-resources:
  #   map.resources :products, :has_many => [ :comments, :sales ], :has_one => :seller
  
  # Sample resource route with more complex sub-resources
  #   map.resources :products do |products|
  #     products.resources :comments
  #     products.resources :sales, :collection => { :recent => :get }
  #   end
  
  map.listing_quick_create '/listings/quick_create', :controller => 'listings', :action => 'quick_create'
  map.compare_listings '/listings/compare/:ids', :controller => 'listings', :action => 'compare', :ids => nil
  map.resources :listings, :member => { :rate => :post, :copy_to_all => :post, :tracking_request => :post, :add_predefined_size => :post, :request_review => :post }, 
                           :collection => { :locator => :get, :info_requests => :post, :import => :post } do |listing|
    listing.resources :sizes
    listing.resources :specials
    listing.resources :maps
    listing.resources :pictures
    listing.resources :reservations
    listing.resources :rentals
    listing.resources :reviews
    listing.resources :facility_features
    listing.resources :business_hours
  end
  
  map.resources :users do |user|
    user.resources :posts, :collection => { :published => :get }
    user.resources :images
    user.resources :comments
    user.resources :tags
    user.resources :permissions
  end
  
  map.resources :clients, :member => { :toggle_specials => :post } do |clients|
    clients.resources :listings, :member => { :disable => :post } do |listings|
      listings.resources :staff_emails
    end
    clients.resources :payments
    clients.resource :settings, :controller => 'account_settings'
  end
  
  map.resources :reservers do |reserver|
    reserver.resources :reservations
  end
  
  map.resources :pages do |page|
    page.resources :views
    page.resources :blocks
    page.resources :tags
    page.resources :suggestions
  end
  
  map.connect 'posts/:title', :controller => 'posts', :action => 'show', :requirements => { :title => /\D+/ }
  map.resources :posts do |post|
    post.resources :views
    post.resources :blocks
    post.resources :tags
  end
  
  map.resources :blocks do |block|
    block.resources :views
    block.resource :widget
  end
  
  map.resources :galleries do |block|
    block.resources :images
  end
  
  map.resources :groups do |group|
    group.resources :links
  end
  
  # Sample resource route (maps HTTP verbs to controller actions automatically):
  #   map.resources :products
  map.resources :user_hints, :member => { :hide => :post, :open => :post }
  map.resources :pictures
  map.resources :user_sessions
  map.resources :permissions
  map.resources :roles
  map.resources :pages
  map.resources :posts, :member => { :rate => :post }
  map.resources :blocks
  map.resources :comments
  map.resources :tags
  map.resources :views
  map.resources :widgets
  map.resources :galleries
  map.resources :images
  map.resources :size_icons
  map.resources :links
  map.resources :link_groups
  map.resources :helptexts
  map.resources :forms
  map.resources :tenants
  map.resources :suggestions
  map.resources :reservations
  map.resources :rentals
  map.resources :specials
  map.resources :predefined_specials
  map.resources :predef_special_assigns
  map.resources :info_requests
  map.resources :payments
  map.resources :facility_features
  map.resources :password_resets, :only => [:new, :create, :edit, :update]
  map.resources :us_cities
  map.resources :searches
  map.resources :ad_partners
  map.resources :predefined_sizes
  
  map.resources :admin
  map.resource :site_setting
  
  # Sample resource route within a namespace:
  #   map.namespace :admin do |admin|
  #     # Directs /admin/products/* to Admin::ProductsController (app/controllers/admin/products_controller.rb)
  #     admin.resources :products
  #   end
  
  map.ajax '/ajax/:action', :controller => 'ajax', :action => nil 
  map.tagged_with '/:model/tagged-with/:tag', :controller => 'tags', :action => 'show'
  map.paperclip_attachment '/images/:id', :controller => 'images', :action => 'show'#, :requirements => { :id => /\d*/ }
  
  # You can have the root of your site routed with map.root -- just remember to delete public/index.html.
  map.root :controller => 'listings', :action => 'locator'
  #map.root :controller => 'pages', :action => 'show', :title => 'home'
  
  # See how all your routes lay out with "rake routes"
  
  # Install the default routes as the lowest priority.
  # Note: These default routes make all actions in every controller accessible via GET requests. You should
  # consider removing or commenting them out if you're using named routes and resources.
  
  map.connect ':title', :controller => 'pages', :action => 'show'
  map.connect ':controller/:action/:id'
  map.connect ':controller/:action/:id.:format'
end
