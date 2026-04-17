const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;
let rippleValues1, rippleValues2;
let textureData;
let rippleData;
let backgroundLoaded = false;

const damping = 0.98;
const rippleRes = 2; // Lower value = higher resolution (and slower)

const backgroundImage = new Image();
backgroundImage.src = 'bg.png';
backgroundImage.onload = () => {
    backgroundLoaded = true;
    init();
};

function init() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Physics buffer sizes (reduced for performance)
    const bufferWidth = Math.ceil(width / rippleRes);
    const bufferHeight = Math.ceil(height / rippleRes);
    const size = bufferWidth * bufferHeight;

    rippleValues1 = new Float32Array(size);
    rippleValues2 = new Float32Array(size);

    // Initial render of background to get pixel data
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tCtx = tempCanvas.getContext('2d');
    
    // Cover fill the background image
    const ratio = Math.max(width / backgroundImage.width, height / backgroundImage.height);
    const newWidth = backgroundImage.width * ratio;
    const newHeight = backgroundImage.height * ratio;
    tCtx.drawImage(backgroundImage, (width - newWidth) / 2, (height - newHeight) / 2, newWidth, newHeight);
    
    textureData = tCtx.getImageData(0, 0, width, height).data;
    rippleData = ctx.createImageData(width, height);
    
    animate();
}

function dropAt(x, y, radius, strength) {
    const bufferWidth = Math.ceil(width / rippleRes);
    const bufferHeight = Math.ceil(height / rippleRes);
    
    const bx = Math.floor(x / rippleRes);
    const by = Math.floor(y / rippleRes);

    for (let j = -radius; j < radius; j++) {
        for (let i = -radius; i < radius; i++) {
            if (bx + i > 0 && bx + i < bufferWidth - 1 && by + j > 0 && by + j < bufferHeight - 1) {
                if (i * i + j * j < radius * radius) {
                    rippleValues1[(by + j) * bufferWidth + (bx + i)] += strength;
                }
            }
        }
    }
}

function processRipples() {
    const bufferWidth = Math.ceil(width / rippleRes);
    const bufferHeight = Math.ceil(height / rippleRes);
    
    for (let y = 1; y < bufferHeight - 1; y++) {
        for (let x = 1; x < bufferWidth - 1; x++) {
            const i = y * bufferWidth + x;
            rippleValues2[i] = (
                rippleValues1[i - 1] +
                rippleValues1[i + 1] +
                rippleValues1[i - bufferWidth] +
                rippleValues1[i + bufferWidth]
            ) / 2 - rippleValues2[i];
            
            rippleValues2[i] *= damping;
        }
    }
    
    // Swap buffers
    let temp = rippleValues1;
    rippleValues1 = rippleValues2;
    rippleValues2 = temp;
}

function render() {
    const bufferWidth = Math.ceil(width / rippleRes);
    const imgData = rippleData.data;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const bx = Math.floor(x / rippleRes);
            const by = Math.floor(y / rippleRes);
            const i = by * bufferWidth + bx;
            
            // Calculate refraction (slope)
            let dx = rippleValues1[i + 1] - rippleValues1[i - 1];
            let dy = rippleValues1[i + bufferWidth] - rippleValues1[i - bufferWidth];
            
            // Offset coordinates for refraction effect
            let tx = Math.floor(x + dx);
            let ty = Math.floor(y + dy);
            
            // Clamp coordinates
            if (tx < 0) tx = 0; if (tx >= width) tx = width - 1;
            if (ty < 0) ty = 0; if (ty >= height) ty = height - 1;
            
            const targetIdx = (ty * width + tx) * 4;
            const pixelIdx = (y * width + x) * 4;
            
            imgData[pixelIdx] = textureData[targetIdx];
            imgData[pixelIdx + 1] = textureData[targetIdx + 1];
            imgData[pixelIdx + 2] = textureData[targetIdx + 2];
            imgData[pixelIdx + 3] = 255;
        }
    }
    ctx.putImageData(rippleData, 0, 0);
}

function animate() {
    processRipples();
    render();
    requestAnimationFrame(animate);
}

// Interaction
let isDragging = false;

window.addEventListener('mousedown', () => isDragging = true);
window.addEventListener('mouseup', () => isDragging = false);

window.addEventListener('mousemove', (e) => {
    // Continuous ripples on move
    dropAt(e.clientX, e.clientY, 3, 20);
    
    // Extra strong ripples on drag
    if (isDragging) {
        dropAt(e.clientX, e.clientY, 5, 50);
    }
});

window.addEventListener('resize', () => {
    init();
});

// Periodic small drops for life
setInterval(() => {
    if (!isDragging) {
        dropAt(Math.random() * width, Math.random() * height, 2, 30);
    }
}, 2000);
