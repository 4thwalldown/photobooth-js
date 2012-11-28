Photobooth = function( container )
{
	//include Slider.js
	
	var hueOffset = 0,
		saturationOffset = 0,
		brightnessOffset = 0,
		pImageCallbacks = [],
		_width = container.offsetWidth,
		_height = container.offsetHeight;

	var fGetUserMedia =
	(
		navigator.getUserMedia ||
		navigator.webkitGetUserMedia ||
		navigator.mozGetUserMedia ||
		navigator.oGetUserMedia ||
		navigator.msieGetUserMedia ||
		false
	);

	var fGetAnimFrame =
	(
		window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		function( callback ){ window.setTimeout(callback, 1000 / 60);}
	);

	var c = function( n ){ return ePhotobooth.getElementsByClassName( n )[ 0 ]; };
	var cE = function( s ){ return document.createElement( s ); };

	var ePhotobooth = cE( "div" );
	ePhotobooth.className = "Photobooth";
	ePhotobooth.innerHTML = '<canvas></canvas><div class="warning notSupported">Sorry,Photobooth.js is not supported by your browser</div><div style="display:none"class="warning noWebcam">Please give Photobooth permission to use your Webcam. <span>Try again</span></div><ul><li title="hue"class="hue"></li><li title="saturation"class="saturation"></li><li title="brightness"class="brightness"></li><li title="crop"class="crop"></li><li title="take picture"class="trigger"></li></ul>';

	var eInput = cE( "canvas" );
	var oInput = eInput.getContext( "2d" );

	var eOutput = ePhotobooth.getElementsByTagName( "canvas" )[ 0 ];
	var oOutput = eOutput.getContext( "2d" );

	var eVideo = cE( "video" );
	eVideo.autoplay = true;
	
	var eNoWebcamWarning = c( "noWebcam" );
	eNoWebcamWarning.getElementsByTagName( "span" )[ 0 ].onclick = function(){ fRequestWebcamAccess(); };

	new Slider( c( "hue" ), function( value ){ hueOffset = value; });
	new Slider( c( "saturation" ), function( value ){ saturationOffset = value; });
	new Slider( c( "brightness" ), function( value ){ brightnessOffset = value; });
	
	this.isSupported = !! fGetUserMedia;

	this.resize = function( width, height )
	{
		_width = width;
		_height = height;
		ePhotobooth.style.width = container.offsetWidth + "px";
		ePhotobooth.style.height = container.offsetHeight + "px";
		eInput.width = container.offsetWidth;
		eInput.height = container.offsetHeight;
		eOutput.width = container.offsetWidth;
		eOutput.height = container.offsetHeight;
		eVideo.width = container.offsetWidth;
		eVideo.height = container.offsetHeight;
	};

	this.addImageCallback = function( callback )
	{
		pImageCallbacks.push( callback );
	};

	var fOnStream = function( oStream )
	{
		try{
			/**
			* Chrome
			*/
			eVideo.src = ( window.URL || window.webkitURL ).createObjectURL( oStream );
			fGetAnimFrame( fNextFrame );
		}
		catch( e )
		{
			/**
			* Firefox
			*/
			eVideo.mozSrcObject  =   oStream ;
			eVideo.addEventListener( "canplay", function(){ fGetAnimFrame( fNextFrame ); }, false );
			eVideo.play();
		}
	};

	var fOnStreamError = function()
	{
		eNoWebcamWarning.style.display = "block";
	};

	var fRequestWebcamAccess = function()
	{
		eNoWebcamWarning.style.display = "none";
		fGetUserMedia.call( navigator, {"video" : true }, fOnStream, fOnStreamError );
	};

	var fHue2rgb = function (p, q, t)
	{
		if(t < 0) t += 1;
		if(t > 1) t -= 1;
		if(t < 1/6) return p + (q - p) * 6 * t;
		if(t < 1/2) return q;
		if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
		return p;
	};

	var fWrap = function( v )
	{
		if( v > 1 ) return v - 1;
		if( v < 0 ) return 1 + v;
		return v;
	};

	var fCap = function( v )
	{
		if( v > 1 ) return 1;
		if( v < 0 ) return 0;
		return v;
	};

	var fNextFrame = function()
	{
		oInput.drawImage( eVideo, 0, 0, _width, _height );
		var oImgData = oInput.getImageData( 0, 0, _width, _height );
		var pData = oImgData.data;

		for( var i = 0; i < pData.length; i += 4 )
		{
			/**
			* Time for some serious Math. Thanks to MJIJACKSON
			* for providing a great starting point
			*
			* http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
			*/
			var r = pData[ i ] / 255,
				g = pData[ i + 1 ] / 255,
				b = pData[ i + 2 ] / 255;
			 
			var max = Math.max(r, g, b),
				min = Math.min(r, g, b);

			var h, s, l = (max + min) / 2;

			if(max == min)
			{
				h = s = 0; // achromatic
			}
			else
			{
				var d = max - min;
				s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
				
				if( max === r ) h = ( (g - b) / d + (g < b ? 6 : 0) ) / 6;
				if( max === g ) h = ( (b - r) / d + 2 ) / 6;
				if( max === b ) h = ( (r - g) / d + 4 ) / 6;
			}

			h = fWrap( h + hueOffset );
			s = fCap( s + saturationOffset );
			l = fCap( l + brightnessOffset );

			if(s === 0)
			{
				r = g = b = l; // achromatic
			}
			else
			{
				var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
				var p = 2 * l - q;
				r = fHue2rgb(p, q, h + 1/3);
				g = fHue2rgb(p, q, h);
				b = fHue2rgb(p, q, h - 1/3);
			}

			pData[ i ] = r * 255;
			pData[ i + 1 ] = g * 255;
			pData[ i + 2 ] = b * 255;
		}

		oOutput.putImageData( oImgData, 0, 0 );

		fGetAnimFrame( fNextFrame );
	};


	if( !fGetUserMedia ) c( "notSupported" )[ 0 ].style.display = "block";

	/**
	* Startup
	*/
	this.resize( _width, _height );
	container.appendChild( ePhotobooth );
	fGetAnimFrame( fRequestWebcamAccess );
};