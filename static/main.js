//========================================================================
// Drag and drop image handling
//========================================================================

var fileDrag = document.getElementById("file-drag");
var fileSelect = document.getElementById("file-upload");

// Add event listeners
fileDrag.addEventListener("dragover", fileDragHover, false);
fileDrag.addEventListener("dragleave", fileDragHover, false);
fileDrag.addEventListener("drop", fileSelectHandler, false);
fileSelect.addEventListener("change", fileSelectHandler, false);

function fileDragHover(e) {
  // prevent default behaviour
  e.preventDefault();
  e.stopPropagation();

  fileDrag.className = e.type === "dragover" ? "upload-box dragover" : "upload-box";
}

function fileSelectHandler(e) {
  // handle file selecting
  var files = e.target.files || e.dataTransfer.files;
  fileDragHover(e);
  for (var i = 0, f; (f = files[i]); i++) {
    previewFile(f);
  }
}

//========================================================================
// Web page elements for functions to use
//========================================================================

var imagePreview = document.getElementById("image-preview");
var imageDisplay = document.getElementById("image-display");
var uploadCaption = document.getElementById("upload-caption");
var predResult = document.getElementById("pred-result");
var predInfo = document.getElementById("pred-info");
var loader = document.getElementById("loader");
var img = new Image;
var image_processed = false;


//========================================================================
// Main button events
//========================================================================

function submitImage() {
  // action for the submit button
  console.log("submit");

  if (!imageDisplay.toDataURL() || !imageDisplay.toDataURL().startsWith("data")) {
    window.alert("Please select an image before submit.");
    return;
  }

  loader.classList.remove("hidden");
  imageDisplay.classList.add("loading");

  // call the predict function of the backend
  predictImage(imageDisplay.toDataURL());
}

function clearImage() {
  // reset selected files
  fileSelect.value = "";

  // remove image sources and hide them
  imagePreview.src = "";
  imageDisplay.src = "";
  predResult.innerHTML = "";

  hide(imagePreview);
  hide(imageDisplay);
  hide(loader);
  hide(predResult);
  hide(predInfo);
  show(uploadCaption);

  imageDisplay.classList.remove("loading");
}

function previewFile(file) {
  // show the preview of the image
  console.log(file.name);
  var fileName = encodeURI(file.name);

  var reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onloadend = () => {
    imagePreview.src = URL.createObjectURL(file);

    show(imagePreview);
    hide(uploadCaption);

    // reset
    imageDisplay.classList.remove("loading");

    displayImage(reader.result, "image-display");
  };
}

imageDisplay.addEventListener('click', function(e) {
  const rect = this.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  if (image_processed) {
    $.ajax({
        type: 'POST', // define the type of HTTP verb we want to use (POST for our form)
        // contentType: "application/json; charset=utf-8",
        dataType: 'json',
        url: '/findEdge', // the url where we want to POST
        data: {
            'image': imageDisplay.toDataURL(),
            'x': x,
            'y' : y
        }, // our data object
        success : function(result) {
          predResult.innerHTML = "Distance to the nearest edge = " + result['distance'];
          show(predResult);
          var context = imageDisplay.getContext('2d');
          context.drawImage(img, 0, 0, imageDisplay.width, imageDisplay.height);
          context.strokeStyle = '#FF8000';
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(result['x'], result['y']);
          context.stroke();
        },
        error : function(errormsg){
            console.log(errormsg);
        }
    });
  }
}, false);

//========================================================================
// Helper functions
//========================================================================

function predictImage(image) {
  fetch("/predict", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(image)
  })
    .then(resp => {
      if (resp.ok){
        const reader = resp.body.getReader();
        return new ReadableStream({
          start(controller) {
            return pump();
            function pump() {
              return reader.read().then(({ done, value }) => {
                // When no more data needs to be consumed, close the stream
                if (done) {
                    controller.close();
                    return;
                }
                // Enqueue the next data chunk into our target stream
                controller.enqueue(value);
                return pump();
              });
            }
          }
        })
      }
    })
    .then(stream => new Response(stream))
    .then(response => response.blob())
    .then(blob => URL.createObjectURL(blob))
    .then(url => displayResult(url))
    .catch(err => {
      console.log("An error occured", err.message);
      window.alert("Oops! Something went wrong.");
    });
}

function displayImage(image, id) {
  // display image on given id <img> element
  let canvas = document.getElementById(id);
  var ctx = canvas.getContext('2d');
  img.onload = function(){
    canvas.width  = img.width;
    canvas.height = img.height;
    ctx.drawImage(img,0,0);
  };
  img.src = image;
  show(canvas);
  hide(predResult);
}

function displayResult(data) {
  // display the result
  image_processed = true;
  hide(loader);
  show(predInfo);
  displayImage(data, "image-display");
}

function hide(el) {
  // hide an element
  el.classList.add("hidden");
}

function show(el) {
  // show an element
  el.classList.remove("hidden");
}
