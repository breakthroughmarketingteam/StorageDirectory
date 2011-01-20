module CommentsHelper
  
  def write_review_link(listing_id)
    "<span href='#write_review' id='write_review'>Your opinion counts. <a href='#write_review' data-listing_id='#{listing_id}'>Write a review!</a></span>"
  end
  
end
