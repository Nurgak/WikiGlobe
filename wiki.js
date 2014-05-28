/***************************************************************************************
 *
 * Title:       Wiki Globe main script file
 * Date:        2014-05-28
 * URL:         https://github.com/Nurgak/WikiGlobe
 * Author:      Karl Kangur <karl.kangur@gmail.com>
 * Licence:     LGPL <http://www.gnu.org/licenses/lgpl.html>
 *
 ***************************************************************************************/

// The used font is LLPixel from http://www.dafont.com/llpixel.font

function WikiGlobe()
{
    // URL to the Wikipedia API page
	this.url = "http://en.wikipedia.org/w/api.php";
    
    // Actually show this number of items on a globe
    // If more are available then pick randomly this number amongst the results
	this.showItems = 20;
    
    // Handle array containing handles for each text element on the globe
    this.handles = [];
    // 3D points for every handle
    this.points = [];
    // Handle containing the title in the center of the page
    this.titleHandle;
    
    // Title is shown in the middle of the page
    this.title = "";
    this.drawing = false;
    
    // For user interaction
    this.mouseStartPos = {x: 0, y: 0};
    this.rotationSpeed = {x: 0, y: 0};
    this.rotationSpeedDecayConstant = Math.exp(-0.1);
    this.mouseIsDown = false;
    
    this.autoRotate = false;
    this.autoRotateSpeedLimit = 0.01;
    
    // Register mouse action callback functions
    // This way they call the WikiGlobe internal handlers
    var local = this;
    document.onmousedown = function(e)
    {
        local.handleMouseDown(e);
    };
    document.onmousemove = function(e)
    {
        local.handleMouseMove(e);
    };
    document.onmouseup = function(e)
    {
        local.handleMouseUp(e);
    };
    window.onresize=function()
    {
        // Center the title on the page
        local.centerTitle();
        // Also replace all the links around the title
        local.draw();
    };
    
    // Register touch events so the WikiGlobe could be used on a tabled with finger gestures
    document.ontouchstart = function(e)
    {
        local.handleTouchStart(e);
    };
    document.ontouchmove = function(e)
    {
        local.handleTouchMove(e);
    };
    document.ontouchend = function(e)
    {
        local.handleTouchEnd(e);
    };
    
    // Register the callbacks for the icons in the corners
    document.getElementById("info").onclick = function()
    {
        local.info();
    };
	
    document.getElementById("info").ontouchstart = function()
    {
        local.info();
    };
    
    document.getElementById("wikiglobe").onclick = function()
    {
        local.autoRotate = true;
    };
	
    document.getElementById("wikiglobe").ontouchstart = function()
    {
        local.autoRotate = true;
    };
    
    document.getElementById("random").onclick = function()
    {
        local.getData();
    };
    
    document.getElementById("random").ontouchstart = function()
    {
        local.getData();
    };
    
    document.getElementById("search").onclick = function()
    {
        local.search();
    };
    
    document.getElementById("search").ontouchstart = function()
    {
        local.search();
    };
    
    // Start the rendering
    this.getData();
}

// Distribute "n" 3D points on a sphere surface
WikiGlobe.prototype.getPositions = function(n)
{
    // Code adepted for JavaScript from http://blog.marmakoide.org/?p=1
    var golden_angle = Math.PI * (3 - Math.sqrt(5));
    var start = 1 / n - 1;
    var end = 1 - 1 / n;
    var step = (end - start) / n;
    var z = start;
    
    this.points = [];
    for(var i = 0; i < n; i++)
    {
        theta = i * golden_angle;
        z += step;
        
        radius = Math.sqrt(1 - z * z);
        
        x = radius * Math.cos(theta);
        y = radius * Math.sin(theta);
        
        this.points.push([x, y, z]);
    }
}

// Fetch a page and its links using Wikipdia API via an AJAX request
WikiGlobe.prototype.getData = function(title)
{
    // If a title is not provided fetch a ranom page
    if(title)
    {
        this.title = title;
        this.getPageLinks();
    }
    else
    {
        // Handler to be used inside the AJAX success function
        var local = this;
        $.ajax(
        {
            url: this.url,
            type: 'GET',
            data: {format: 'json', action: 'query', list: 'random', rnnamespace: '0'},
            dataType: "jsonp",
            success: function(data)
            {
                // Set the title and update links on the globe
                //this.setTitle(data['query']['random'][0]['title']);
                local.title = data['query']['random'][0]['title'];
                local.getPageLinks();
            },
            complete: function()
            {
                // Stop the chrome spinner from spinning
                document.close();
            }
        });
    }
}

WikiGlobe.prototype.getPageLinks = function()
{
    this.clearHandles();
    var linkArray = [];
    
    // Handler to be used inside the AJAX success function
    var local = this;
    $.ajax(
    {
        url: this.url,
        type: 'GET',
        data: {format: 'json', action: 'query', titles: this.title, prop: 'links', pllimit: 'max', plnamespace: 0, redirects: 0},
        dataType: "jsonp",
        success: function(data)
        {
            var pages = data['query']['pages'];
           
            // Since the page is inside an associative array with a unique ID just pick the first element
            for(var page in pages)
            {
                links = pages[page]['links'];
                break;
            }
           
            // Sometimes there can be pages without links
            if(links == undefined)
            {
                return;
            }
           
            // Store all link titles
            var i = 0;
            while(links[i])
            {
                linkArray.push(links[i]['title']);
                i++;
            }
           
            // Select randomly from the list if there are more than this.showItems elements
            if(i > local.showItems)
            {
                for(j = 0; j < i - local.showItems; j++)
                {
                    rand = Math.floor(Math.random() * linkArray.length);
                    linkArray.splice(rand, 1);
                }
            }
       
            // Randomise links order so that "A"'s wouldn't all be near each other on the spehre for example
            linkArray.sort(function()
            {
                return 0.5 - Math.random()
            });
        },
        complete: function()
        {
            local.buildHandles(linkArray);
            //local.drawingHandler = setInterval(local.draw(local), 40);
            local.draw();
        }
    });
}

// Helper function for animation frame requests
window.requestFrame = (function()
{
	return window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		function(callback, element)
		{
			window.setTimeout(callback, 40);
		}
})();

WikiGlobe.prototype.clearHandles = function()
{
    // Clear all handles to free memory
    for(i = 0; i < this.handles.length; i++)
    {
        this.handles[i].remove();
    }
    this.handles = [];
}

WikiGlobe.prototype.buildHandles = function(linkArray)
{
    // Get 3D points distributed over a globe
    this.getPositions(linkArray.length);
    
    var local = this;
    
    for(i = 0; i < linkArray.length; i++)
    {
        var handle = document.createElement("div");
        $(handle).addClass("handle");
        
        // Build the link
        var link = document.createElement("a");
        var text = document.createTextNode(linkArray[i]);
        link.appendChild(text);
        link.href = "http://en.wikipedia.org/wiki/" + linkArray[i].replace(/\s/g, "_");
        link.onclick = function(event)
        {
            event.preventDefault();
            local.getData($(this).text());
        }
    
		link.ontouchstart = function()
		{
            event.preventDefault();
            local.getData($(this).text());
		};
    
        // Actually add the link to the page
        $(handle).html(link).appendTo('body');
        
        // Add the handle reference to the handles array
        this.handles.push(handle);
    }
    
    this.moveHandles();
    
    // Create the title hander only once
    if(!this.titleHandle)
    {
        this.titleHandle = document.createElement("div");
        // Set ID so the the css style would be applied
        this.titleHandle.id = "title";
    }
    
    // Create the actual text node
    text = document.createTextNode(this.title);
    // Create the link to the page replaying spaces with underscores
    link = document.createElement("a");
    link.href = "http://en.wikipedia.org/wiki/" + this.title.replace(/\s/g, "_");
    
    // Link opens a popup with an iframe to the Wikipedia article
    link.onclick = function(event)
    {
        event.preventDefault();
        iframe = $('<iframe style="width: 100%; height: 100%;" />').attr('src', this.href);
        local.popup(iframe);
    }

	link.ontouchstart = function(event)
    {
        event.preventDefault();
        iframe = $('<iframe style="width: 100%; height: 100%;" />').attr('src', this.href);
        local.popup(iframe);
	};
    
    link.appendChild(text);
    
    // Append the title to the body
    $(this.titleHandle).html(link).appendTo('body');
    
    // Move the title to the center of the page
    this.centerTitle();
}

// This is called at start and every time the window is resized
WikiGlobe.prototype.centerTitle = function()
{
    $(this.titleHandle).css("left", - $(this.titleHandle).width() / 2 + $(document).width() / 2 + "px");
    $(this.titleHandle).css("top", - $(this.titleHandle).height() / 2 + $(document).height() / 2 + "px");
}

// Move the handles to their position on screen
WikiGlobe.prototype.moveHandles = function()
{
    // Make sure the sphere fits the available screen area
    sphereSize = 0.4 * ($(document).width() > $(document).height() ? $(document).height() : $(document).width());
    
    for(i = 0; i < this.handles.length; i++)
    {
        var h = this.handles[i];
        var p = this.points[i];
        
        x = p[0];
        y = p[1];
        z = p[2];
        r = Math.sqrt(x*x + z*z)
        
        // Scale the font according to the distance from user
        $(h).css("transform", "scale(" + (p[2] / r + 1.1) + ")");
        
        // Move the handle in space
        $(h).css("left", x * sphereSize - $(h).width() / 2 + $(document).width() / 2 + "px");
        $(h).css("top", y * sphereSize - $(h).height() / 2 + $(document).height() / 2 + "px");
        
        // Organise items depth, items closer to the user are drawn over items further away
        $(h).css("z-index", Math.round(p[2] * 10));
    }
}

// Draw the WikiGlobe object
WikiGlobe.prototype.draw = function()
{
    if(!this.autoRotate)
    {
        rotationSpeedX = this.rotationSpeed.x / $(document).width();
        rotationSpeedY = this.rotationSpeed.y / $(document).height();
    }
    
    // If the user has released the mouse and the sphere is still rotating slow it down instead of stopping it right away
    if(!this.autoRotate && !this.mouseIsDown && (this.rotationSpeed.x || this.rotationSpeed.y))
    {
        if(Math.abs(this.rotationSpeed.x) > 1)
        {
            this.rotationSpeed.x = this.rotationSpeed.x * this.rotationSpeedDecayConstant;
        }
        else
        {
            this.rotationSpeed.x = 0;
        }
        
        if(Math.abs(this.rotationSpeed.y) > 1)
        {
            this.rotationSpeed.y = this.rotationSpeed.y * this.rotationSpeedDecayConstant;
        }
        else
        {
            this.rotationSpeed.y = 0;
        }
    }
    
    for(var i = 0; i < this.points.length; i++)
    {
        // Load the 3D point
        var p = this.points[i];
        
        // Rotate every link in its own direction
        if(this.autoRotate)
        {
            rotationSpeedX = this.autoRotateSpeedLimit * Math.sin(i);
            rotationSpeedY = this.autoRotateSpeedLimit * Math.cos(3 * i);
        }
        
        // Rotate around x axis
        x = p[0];
        y = p[1];
        z = p[2];
        
        // Get radius
        r = Math.sqrt(x*x + z*z)
        // Get current angle
        a = Math.atan2(z, x);
        // Get new position
        x = r * Math.cos(a + rotationSpeedX);
        z = r * Math.sin(a + rotationSpeedX);
        
        p = [x, y, z];
        
        // Rotate around y axis
        x = p[0];
        y = p[1];
        z = p[2];
        
        r = Math.sqrt(y*y + z*z)
        a = Math.atan2(z, y);
        y = r * Math.cos(a + rotationSpeedY);
        z = r * Math.sin(a + rotationSpeedY);
        
        p = [x, y, z];
        
        // Save the 3D point
        this.points[i] = p;
    }
    
    // Actually move the links to their new positions
    this.moveHandles();
    
    // Continously render as long as the user is interacting with the WikiGlobe
    if(this.mouseIsDown || rotationSpeedX != 0 || rotationSpeedY != 0)
    {
        // Request the next frame
        this.drawing = true;
        window.requestFrame(this.draw.bind(this));
    }
    else
    {
        this.drawing = false;
    }
}

// A box that appears in the center of the page that can show content of HTML code
WikiGlobe.prototype.popup = function(content, _width, _height)
{
    // Fetch the handler on the page
    this.popupHander = $("#popup");
    
    // Popup size can be defined or it will take 90% of the page with and height
    if(!_width)
    {
        width = $(document).width() * 0.9;
    }
    else
    {
        width = _width;
    }
    
    if(!_height)
    {
        height = $(document).height() * 0.9;
    }
    else
    {
        height = _height;
    }
    
    // Add close button to the popup
    closeButton = document.createElement("div");
    closeButton.id = "close";
    $(closeButton).html('<img src="img/close.png">');
    var local = this;
    closeButton.onclick = function(event)
    {
        local.closePopup();
    };
	
    closeButton.ontouchstart = function(event)
    {
        local.closePopup();
    };
    
    // Set popup size and position
    $(this.popupHander).css("width", width + "px");
    $(this.popupHander).css("height", height + "px");
    
    $(this.popupHander).css("left", ($(document).width() - width) / 2 + "px");
    $(this.popupHander).css("top", ($(document).height() - height) / 2 + "px");
    
    // Add content and display
    $(this.popupHander).html(content).append(closeButton).appendTo('body');
    $(this.popupHander).css("display", "block");
}

WikiGlobe.prototype.closePopup = function()
{
    $(this.popupHander).css("display", "none");
}

WikiGlobe.prototype.info = function()
{
    data = "<h1>Wiki Globe</h1>";
    data += "<ul><li>Author: Karl Kangur</li><li>Date: 2014-05-10</li><li>Link: <a href=\"https://github.com/Nurgak/WikiGlobe\">https://github.com/Nurgak/WikiGlobe</a></li></ul>";
    data += "<p>This is a data visulasiser that uses Wikipedia as the data source via its API.</p>";
    data += "<p>The current article title is shown in the middle of the page while links from that article surround it. If one drags the mouse the link sphere will rotate around the title giving access to links in the back.</p>";
    data += "<p>When the user clicks on a link the sphere it will load that article and extract the links the same way, this is a way to explore Wikipedia only using links in the articles. If the central link is clicked the article opens for the user to read it.</p>";
    this.popup(data, 500, 400);
}

WikiGlobe.prototype.search = function()
{
    data = "<h1>Search</h1>";
    data += '<input type="text" id="searchInput" /><img id="searchButton" src="img/go.png" />';
    this.popup(data, 500, 180);
    
    // Register the search button
    var local = this;
    document.getElementById("searchButton").onclick = function()
    {
        if(local.fetchPage())
        {
            local.closePopup();
        }
    };
	
	document.getElementById("searchButton").ontouchstart = function()
    {
        if(local.fetchPage())
        {
            local.closePopup();
        }
    };
}

WikiGlobe.prototype.fetchPage = function()
{
    var value = document.getElementById("searchInput").value;
    if(value)
    {
        this.getData(value);
        return true;
    }
    return false;
}

// Mouse interaction functions
WikiGlobe.prototype.handleMouseDown = function(event)
{
    // Cancel auto rotate if it's enabled
    if(this.autoRotate)
    {
        this.autoRotate = false;
    }
    
    this.mouseIsDown = true;
    this.mouseStartPos = [event.pageX, event.pageY];
    // Actually start rendering
    if(!this.drawing)
    {
        this.draw();
    }
}

WikiGlobe.prototype.handleMouseMove = function(event)
{
    if(this.mouseIsDown)
    {
        speedX = this.mouseStartPos[0] - event.pageX;
        speedY = this.mouseStartPos[1] - event.pageY;
        this.rotationSpeed = {x: speedX, y: speedY};
    }
}

WikiGlobe.prototype.handleMouseUp = function(event)
{
    this.mouseIsDown = false;
}

// Touch handlers for tablets
WikiGlobe.prototype.handleTouchStart = function(event)
{
    this.handleMouseDown(event.touches[0]);
    event.preventDefault();
}

WikiGlobe.prototype.handleTouchMove = function(event)
{
    this.handleMouseMove(event.touches[0]);
    event.preventDefault();
}

WikiGlobe.prototype.handleTouchEnd = function(event)
{
    this.handleMouseUp(event.touches[0]);
    event.preventDefault();
}

$(document).ready(function()
{
    var wg = new WikiGlobe();
});
