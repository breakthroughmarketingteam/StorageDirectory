# Allow the metal piece to run in isolation
require(File.dirname(__FILE__) + "/../../config/environment") unless defined?(Rails)

class MarkerMaker
  class << self
    # URLs for marker images by number size:
    # ------> (n < 10): /marker_maker?n=<num>&color=white&font_size=14&offset=10x3
    # ------> (n > 9 && n < 100): /marker_maker?n=<num>&color=white&offset=5x3&font_size=14
    # ------> (n > 99): /marker_maker?n=<num>&color=white&offset=5x5&font_size=11
    
    def call(env)
      if env['PATH_INFO'] =~ /^\/marker_maker/
        params = HashWithIndifferentAccess[*split_query(env['QUERY_STRING'])] # query string to hash
        @image = Magick::Image.read(RAILS_ROOT+ (params.delete(:base_image) || '/public/images/ui/storagelocator/result-number.png')).first
        
        operate params.delete(:n), params.symbolize_keys
        
        [200, {'Content-Type' => 'image/png'}, [@image.to_blob]]
      else
        [404, {'Content-Type' => 'text/html'}, ['Not Found']]
      end
    end
    
    # Code taken from Fleximage: https://github.com/Squeegy/fleximage
    
    def operate(string_to_write, options = {})
      options = {
        :alignment  => :top_left,
        :offset     => '0x0',
        :antialias  => true,
        :color      => 'black',
        :font_size  => 12,
        :font       => nil,
        :text_align => :left,
        :rotate     => 0,
        :shadow     => nil,
        :stroke     => {
          :width => 0,
          :color => 'white',
        }
      }.merge(options)
      
      options[:offset] = size_to_xy(options[:offset])

      # prepare drawing surface
      text = Magick::Draw.new
      text.gravity        = symbol_to_gravity(options[:alignment])
      text.fill           = options[:color]
      text.text_antialias = options[:antialias]
      text.pointsize      = options[:font_size].to_i
      text.rotation       = options[:rotate]
      text.font_weight    = options[:font_weight] if options[:font_weight]

      if options[:stroke][:width] > 0
        text.stroke_width = options[:stroke][:width]
        text.stroke = options[:stroke][:color]
      end

      # assign font path with to rails root unless the path is absolute
      if options[:font]
        font = options[:font]
        font = "#{RAILS_ROOT}/#{font}" unless font =~ %r{^(~?|[A-Za-z]:)/}
        text.font = font
      end

      # draw text on transparent image
      temp_image = Magick::Image.new(@image.columns, @image.rows) { self.background_color = 'none' }
      temp_image = temp_image.annotate(text, 0, 0, options[:offset][0], options[:offset][1], string_to_write)

      # add drop shadow to text image
      if options[:shadow]
        shadow_args = [2, 2, 1, 1]
        if options[:shadow].is_a?(Hash)
          #shadow_args[0], shadow_args[1] = size_to_xy(options[:shadow][:offset]) if options[:shadow][:offset]
          shadow_args[2] = options[:shadow][:blur] if options[:shadow][:blur]
          shadow_args[3] = options[:shadow][:opacity] if options[:shadow][:opacity]
        end
        shadow = temp_image.shadow(*shadow_args)
        temp_image = shadow.composite(temp_image, 0, 0, symbol_to_blending_mode(:over))
      end

      # composite text on original image
      @image.composite! temp_image, 0, 0, symbol_to_blending_mode(:over)
    end
    
    # Allows access to size conversion globally. See size_to_xy for a more detailed explanation
    def size_to_xy(size)
      case when size.is_a?(Array) && size.size == 2 # [320, 240]
        size
      when size.to_s.include?('x') # "320x240"
        size.split('x').collect(&:to_i)
      else # Anything else, convert the object to an integer and assume square dimensions
        [size.to_i, size.to_i]
      end
    end
    
    # Convert a symbol to an RMagick blending mode.
    #
    # The blending mode governs how the overlay gets composited onto the image. You can
    # get some funky effects with modes like :+copy_cyan+ or :+screen+. For a full list of blending
    # modes checkout the RMagick documentation (http://www.simplesystems.org/RMagick/doc/constants.html#CompositeOperator).
    # To use a blend mode remove the +CompositeOp+ form the name and "unserscorize" the rest. For instance,
    # +MultiplyCompositeOp+ becomes :+multiply+, and +CopyBlackCompositeOp+ becomes :+copy_black+.
    def symbol_to_blending_mode(mode)
      "Magick::#{mode.to_s.camelize}CompositeOp".constantize
    rescue NameError
      raise ArgumentError, ":#{mode} is not a valid blending mode."
    end

    def symbol_to_gravity(gravity_name)
      gravity = MGRAVITIES[gravity_name]

      if gravity
        gravity
      else
        raise ArgumentError, ":#{gravity_name} is not a valid gravity name.\n\nValid names are :center, :top, :top_right, :right, :bottom_right, :bottom, :bottom_left, :left, :top_left"
      end
    end

    # split the query adding blank values to the array where the query had nothing
    def split_query(query)
      query.split('&').map do |pairs|
        p = pairs.split('=')
        [CGI.unescape(p[0]), CGI.unescape(p[1] || '')]
      end.flatten
    end
  end
  
  # Conversion table for mapping alignment symbols to their equivalent RMagick gravity constants.
  MGRAVITIES = {
    :center       => ::Magick::CenterGravity,
    :top          => ::Magick::NorthGravity,
    :top_right    => ::Magick::NorthEastGravity,
    :right        => ::Magick::EastGravity,
    :bottom_right => ::Magick::SouthEastGravity,
    :bottom       => ::Magick::SouthGravity,
    :bottom_left  => ::Magick::SouthWestGravity,
    :left         => ::Magick::WestGravity,
    :top_left     => ::Magick::NorthWestGravity,
  }
end