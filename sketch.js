// Can specifications (in mm and grams)
const canSpecs = {
    redbull: {
        name: "Red Bull",
        height: 168,
        radius: 32,
        emptyMass: 15,
        volume: 473,  // ml
        color: [0, 112, 192],
        liquidColor: [255, 200, 50]
    },
    monster: {
        name: "Monster",
        height: 178,
        radius: 33,
        emptyMass: 18,
        volume: 500,  // ml
        color: [0, 150, 50],
        liquidColor: [100, 255, 100]
    },
    cola: {
        name: "Coca-Cola",
        height: 123,
        radius: 33,
        emptyMass: 13,
        volume: 355,  // ml
        color: [200, 0, 0],
        liquidColor: [60, 30, 0]
    }
};

// Simulation state
let currentCan = 'redbull';
let fillLevel = 100; // percentage
let horizontalForce = 5.0; // m/s²
let canHeight = canSpecs.redbull.height;
let canRadius = canSpecs.redbull.radius;
let emptyMass = canSpecs.redbull.emptyMass;

// Display toggles
let showCOM = true;
let showForce = true;
let showPivot = true;
let showGraph = true;

// Physics constants
const g = 9.81; // m/s²
const SCALE = 2.5; // pixels per mm

// Canvas references
let mainCanvas;
let graphCanvas;

// Responsive canvas sizing
let mainCanvasWidth = 700;
let mainCanvasHeight = 600;
let baseOffset = 80;
let baseYPosition = 520;
let graphCanvasWidth = 1300;
let graphCanvasHeight = 400;
let currentScale = SCALE;
let isMobileLayout = false;

// Calculated values
let centerOfMass;
let totalMass;
let tippingAngle;
let criticalAcceleration;
let stabilityFactor;
let wouldTip = false;
let optimalFillLevel = 0;

function setup() {
    // Create main canvas for can visualization
    mainCanvas = createCanvas(mainCanvasWidth, mainCanvasHeight);
    mainCanvas.parent('canvas-container');
    
    // Create graph canvas
    graphCanvas = createGraphics(graphCanvasWidth, graphCanvasHeight);
    const graphContainer = document.getElementById('graph-canvas-container');
    if (graphContainer) {
        graphContainer.innerHTML = '';
        graphCanvas.canvas.style.width = '100%';
        graphCanvas.canvas.style.height = 'auto';
        graphCanvas.canvas.style.display = showGraph ? 'block' : 'none';
        graphContainer.appendChild(graphCanvas.canvas);
    }
    
    // Set up event listeners
    setupControls();
    
    // Calculate optimal fill level
    calculateOptimalFillLevel();
    
    // Initial calculation
    updatePhysics();
    updateCanvasSizes();
}

function draw() {
    background(240, 245, 255);
    
    // Update physics
    updatePhysics();
    baseYPosition = mainCanvasHeight - baseOffset;
    const maxHeightScale = (baseYPosition - 60) / canHeight;
    const maxWidthScale = (mainCanvasWidth * 0.42) / canRadius;
    currentScale = Math.max(0.6, Math.min(SCALE, maxHeightScale, maxWidthScale));
    
    // Draw main visualization
    push();
    translate(mainCanvasWidth / 2, baseYPosition);
    drawTable();
    drawCan();
    if (showPivot) drawPivotPoint();
    if (showCOM) drawCenterOfMass();
    if (showForce) drawForceVectors();
    pop();
    
    // Draw stability graph on separate canvas
    if (showGraph) {
        if (graphCanvas && graphCanvas.canvas) {
            graphCanvas.canvas.style.display = 'block';
        }
        drawStabilityGraph();
    } else if (graphCanvas && graphCanvas.canvas) {
        graphCanvas.canvas.style.display = 'none';
    }
    
    // Update info panel
    updateInfoPanel();
}

function setupControls() {
    // Fill level slider
    const fillSlider = document.getElementById('fill-slider');
    fillSlider.addEventListener('input', (e) => {
        fillLevel = parseFloat(e.target.value);
        document.getElementById('fill-value').textContent = fillLevel.toFixed(0) + '%';
    });
    
    // Force slider
    const forceSlider = document.getElementById('force-slider');
    forceSlider.addEventListener('input', (e) => {
        horizontalForce = parseFloat(e.target.value);
        document.getElementById('force-value').textContent = horizontalForce.toFixed(1) + ' m/s²';
    });
    
    // Height slider
    const heightSlider = document.getElementById('height-slider');
    heightSlider.addEventListener('input', (e) => {
        canHeight = parseFloat(e.target.value);
        document.getElementById('height-value').textContent = canHeight.toFixed(0) + ' mm';
        calculateOptimalFillLevel();
    });
    
    // Radius slider
    const radiusSlider = document.getElementById('radius-slider');
    radiusSlider.addEventListener('input', (e) => {
        canRadius = parseFloat(e.target.value);
        document.getElementById('radius-value').textContent = canRadius.toFixed(0) + ' mm';
        calculateOptimalFillLevel();
    });
    
    // Mass slider
    const massSlider = document.getElementById('mass-slider');
    massSlider.addEventListener('input', (e) => {
        emptyMass = parseFloat(e.target.value);
        document.getElementById('mass-value').textContent = emptyMass.toFixed(0) + ' g';
        calculateOptimalFillLevel();
    });
    
    // Display toggles
    document.getElementById('show-com').addEventListener('change', (e) => {
        showCOM = e.target.checked;
    });
    document.getElementById('show-force').addEventListener('change', (e) => {
        showForce = e.target.checked;
    });
    document.getElementById('show-pivot').addEventListener('change', (e) => {
        showPivot = e.target.checked;
    });
    document.getElementById('show-graph').addEventListener('change', (e) => {
        showGraph = e.target.checked;
        if (graphCanvas && graphCanvas.canvas) {
            graphCanvas.canvas.style.display = showGraph ? 'block' : 'none';
        }
        if (showGraph) {
            drawStabilityGraph();
        }
        updateCanvasSizes();
    });
}

function selectCan(canType) {
    currentCan = canType;
    const spec = canSpecs[canType];
    
    // Update sliders
    canHeight = spec.height;
    canRadius = spec.radius;
    emptyMass = spec.emptyMass;
    
    document.getElementById('height-slider').value = canHeight;
    document.getElementById('radius-slider').value = canRadius;
    document.getElementById('mass-slider').value = emptyMass;
    
    document.getElementById('height-value').textContent = canHeight.toFixed(0) + ' mm';
    document.getElementById('radius-value').textContent = canRadius.toFixed(0) + ' mm';
    document.getElementById('mass-value').textContent = emptyMass.toFixed(0) + ' g';
    
    // Update button states
    document.querySelectorAll('.can-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.can === canType);
    });
    
    calculateOptimalFillLevel();
}

function updatePhysics() {
    // Calculate liquid height and mass
    const liquidHeight = (fillLevel / 100) * canHeight;
    const volume = canSpecs[currentCan].volume;
    const liquidMass = (fillLevel / 100) * volume; // 1ml = 1g for water
    
    totalMass = emptyMass + liquidMass;
    
    // Calculate center of mass
    // Empty can: assume uniform distribution, COM at height/2
    const emptyCanCOM = canHeight / 2;
    
    // Liquid: COM at liquidHeight/2
    const liquidCOM = liquidHeight / 2;
    
    // Combined COM using weighted average
    centerOfMass = (emptyMass * emptyCanCOM + liquidMass * liquidCOM) / totalMass;
    
    // Calculate tipping angle
    // The can tips when the center of mass goes beyond the edge of the base
    tippingAngle = Math.atan(canRadius / centerOfMass);
    
    // Calculate critical acceleration
    // tan(theta) = a/g, where theta is the angle the can makes with vertical
    // At tipping point: tan(theta_tip) = a_crit/g
    criticalAcceleration = g * Math.tan(tippingAngle);
    
    // Stability factor: ratio of critical acceleration to applied acceleration
    stabilityFactor = criticalAcceleration / horizontalForce;
    
    // Check if would tip
    wouldTip = horizontalForce >= criticalAcceleration;
}

function calculateOptimalFillLevel() {
    // Find fill level that maximizes critical acceleration
    let maxCritAccel = 0;
    let bestFill = 0;
    
    for (let fill = 0; fill <= 100; fill += 0.5) {
        const lh = (fill / 100) * canHeight;
        const volume = canSpecs[currentCan].volume;
        const lm = (fill / 100) * volume;
        const tm = emptyMass + lm;
        
        const eCOM = canHeight / 2;
        const lCOM = lh / 2;
        const com = (emptyMass * eCOM + lm * lCOM) / tm;
        
        const ta = Math.atan(canRadius / com);
        const ca = g * Math.tan(ta);
        
        if (ca > maxCritAccel) {
            maxCritAccel = ca;
            bestFill = fill;
        }
    }
    
    optimalFillLevel = bestFill;
}

function updateCanvasSizes() {
    const canvasContainer = document.getElementById('canvas-container');
    let availableWidth = windowWidth - 80;
    if (canvasContainer) {
        const containerWidth = canvasContainer.clientWidth;
        availableWidth = containerWidth > 0 ? containerWidth : availableWidth;
    }
    const viewportWidthTarget = Math.max(240, windowWidth - 32);
    availableWidth = Math.min(availableWidth, viewportWidthTarget);
    availableWidth = Math.max(240, availableWidth);
    mainCanvasWidth = Math.min(700, availableWidth);
    mainCanvasHeight = windowWidth < 768 ? 520 : 600;
    baseOffset = windowWidth < 768 ? 60 : 80;
    baseYPosition = mainCanvasHeight - baseOffset;

    resizeCanvas(mainCanvasWidth, mainCanvasHeight);
    if (mainCanvas && mainCanvas.elt) {
        mainCanvas.elt.style.width = '100%';
        mainCanvas.elt.style.height = 'auto';
    }

    const graphContainer = document.getElementById('graph-canvas-container');
    if (graphContainer && graphCanvas) {
        let graphAvailableWidth = graphContainer.clientWidth ? graphContainer.clientWidth : availableWidth;
        graphAvailableWidth = Math.min(graphAvailableWidth, viewportWidthTarget);
    graphAvailableWidth = Math.max(240, graphAvailableWidth);
        graphCanvasWidth = Math.min(1300, graphAvailableWidth);
        graphCanvasHeight = windowWidth < 768 ? 340 : 400;
        graphCanvas.resizeCanvas(graphCanvasWidth, graphCanvasHeight);
        graphCanvas.canvas.style.width = '100%';
        graphCanvas.canvas.style.height = 'auto';
        graphCanvas.canvas.style.display = showGraph ? 'block' : 'none';
    }

    const canTypeDetails = document.getElementById('can-type-details');
    if (canTypeDetails) {
        const mobileLayout = windowWidth <= 768;
        if (mobileLayout !== isMobileLayout) {
            isMobileLayout = mobileLayout;
            if (mobileLayout) {
                canTypeDetails.removeAttribute('open');
            } else {
                canTypeDetails.setAttribute('open', '');
            }
        }
    }
}

function drawTable() {
    // Draw table surface
    stroke(80);
    strokeWeight(4);
    const halfSpan = mainCanvasWidth * 0.48;
    line(-halfSpan, 0, halfSpan, 0);
    
    // Hatch marks to show infinite friction
    const spacing = 18;
    for (let x = -halfSpan; x <= halfSpan; x += spacing) {
        line(x, 0, x - spacing * 0.45, Math.min(12, spacing * 0.65));
    }
}

function drawCan() {
    const h = canHeight * currentScale;
    const r = canRadius * currentScale;
    const liquidH = (fillLevel / 100) * h;
    
    // Get colors
    const spec = canSpecs[currentCan];
    
    // Draw can body
    fill(spec.color[0], spec.color[1], spec.color[2], 200);
    stroke(0);
    strokeWeight(2);
    rect(-r, -h, r * 2, h, 5, 5, 0, 0);
    
    // Draw liquid
    if (fillLevel > 0) {
        fill(spec.liquidColor[0], spec.liquidColor[1], spec.liquidColor[2], 180);
        noStroke();
        rect(-r, -liquidH, r * 2, liquidH);
        
        // Draw liquid surface with waves
        stroke(spec.liquidColor[0] * 0.7, spec.liquidColor[1] * 0.7, spec.liquidColor[2] * 0.7);
        strokeWeight(2);
        line(-r, -liquidH, r, -liquidH);
    }
    
    // Draw can top
    fill(spec.color[0] * 0.8, spec.color[1] * 0.8, spec.color[2] * 0.8);
    stroke(0);
    strokeWeight(2);
    ellipse(0, -h, r * 2, r * 0.8);
    
    // Draw can label
    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(constrain(16 * currentScale / SCALE, 12, 20));
    textStyle(BOLD);
    text(spec.name, 0, -h * 0.6);
    
    // Draw percentage if not full
    if (fillLevel < 100) {
        textSize(constrain(20 * currentScale / SCALE, 14, 24));
        fill(255, 255, 0);
        text(fillLevel.toFixed(0) + '%', 0, -h * 0.4);
    }
}

function drawCenterOfMass() {
    const comY = -centerOfMass * currentScale;
    
    // Draw COM indicator
    fill(255, 0, 0);
    stroke(255, 255, 255);
    strokeWeight(2);
    ellipse(0, comY, 20, 20);
    
    // Draw crosshair
    stroke(255, 0, 0);
    strokeWeight(3);
    line(-15, comY, 15, comY);
    line(0, comY - 15, 0, comY + 15);
    
    // Label
    fill(255, 0, 0);
    noStroke();
    textAlign(LEFT, CENTER);
    textSize(14);
    text('COM', 25, comY);
    
    // Draw horizontal line to edge
    stroke(255, 0, 0, 100);
    strokeWeight(1);
    const r = canRadius * currentScale;
    line(0, comY, r, comY);
    line(0, comY, r, 0);
}

function drawPivotPoint() {
    // Draw the pivot point (edge of can base)
    const r = canRadius * currentScale;
    
    fill(255, 165, 0);
    stroke(255);
    strokeWeight(2);
    ellipse(r, 0, 15, 15);
    
    // Draw triangle to show rotation direction
    fill(255, 165, 0, 150);
    noStroke();
    triangle(r, -20, r + 15, -5, r - 15, -5);
    
    // Label
    fill(255, 165, 0);
    textAlign(CENTER, TOP);
    textSize(12);
    text('PIVOT', r, 10);
}

function drawForceVectors() {
    const comY = -centerOfMass * currentScale;
    
    // Scale factor for force arrows
    const forceScale = 10;
    
    // Draw horizontal force (train acceleration)
    const maxHorizontal = mainCanvasWidth * 0.45;
    const horizontalLength = constrain(horizontalForce * forceScale, -maxHorizontal, maxHorizontal);
    stroke(0, 100, 255);
    strokeWeight(4);
    fill(0, 100, 255);
    
    // Arrow from COM
    drawArrow(0, comY, horizontalLength, comY, 'Train Force');
    
    // Draw gravity force
    const gravityLength = (totalMass / 100) * forceScale;
    stroke(150, 0, 255);
    strokeWeight(4);
    fill(150, 0, 255);
    
    drawArrow(0, comY, 0, comY + gravityLength, 'Gravity');
    
    // Draw resultant force angle
    if (wouldTip) {
        stroke(255, 0, 0);
        strokeWeight(2);
        noFill();
        const r = canRadius * currentScale;
        arc(r, 0, 60, 60, -PI/2, -PI/2 + tippingAngle);
        // draw indicator line to highlight tipping angle boundary
    const labelRadius = r + Math.min(60, mainCanvasWidth * 0.12);
        const angleMid = -PI/2 + tippingAngle / 2;
        const labelX = r + cos(angleMid) * labelRadius;
        const labelY = sin(angleMid) * labelRadius;
        stroke(255, 0, 0);
        line(r, 0, labelX, labelY);
        noStroke();
        fill(255, 170, 170);
        textAlign(LEFT, CENTER);
        textSize(12);
        text('Critical tip angle', labelX + 8, labelY);
        
        fill(255, 0, 0);
        noStroke();
        textAlign(LEFT, CENTER);
        textSize(12);
        text('TIPPING WARNING', r + 40, -20);
    }
}

function drawArrow(x1, y1, x2, y2, label) {
    // Draw line
    line(x1, y1, x2, y2);
    
    // Draw arrowhead
    push();
    translate(x2, y2);
    const angle = atan2(y2 - y1, x2 - x1);
    rotate(angle);
    triangle(0, 0, -10, -5, -10, 5);
    pop();
    
    // Label
    if (label) {
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(12);
        text(label, (x1 + x2) / 2, (y1 + y2) / 2 - 15);
    }
}

function drawStabilityGraph() {
    const gc = graphCanvas;
    
    gc.clear();
    gc.background(255, 255, 255, 230);
    
    const graphW = gc.width;
    const graphH = gc.height;
    
    // Title
    gc.fill(0);
    gc.noStroke();
    gc.textAlign(CENTER, TOP);
    gc.textSize(18);
    gc.textStyle(BOLD);
    gc.text('Stability Analysis: Critical Acceleration vs Fill Level', graphW/2, 10);
    
    // Calculate graph data
    const dataPoints = [];
    let maxCrit = 0;
    
    for (let fill = 0; fill <= 100; fill += 1) {
        const lh = (fill / 100) * canHeight;
        const volume = canSpecs[currentCan].volume;
        const lm = (fill / 100) * volume;
        const tm = emptyMass + lm;
        
        const eCOM = canHeight / 2;
        const lCOM = lh / 2;
        const com = (emptyMass * eCOM + lm * lCOM) / tm;
        
        const ta = Math.atan(canRadius / com);
        const ca = g * Math.tan(ta);
        
        dataPoints.push({fill, critAccel: ca});
        if (ca > maxCrit) maxCrit = ca;
    }
    
    // Draw axes
    const plotX = 60;
    const plotY = 60;
    const plotW = graphW - 100;
    const plotH = graphH - 120;
    
    gc.stroke(0);
    gc.strokeWeight(2);
    gc.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH); // x-axis
    gc.line(plotX, plotY, plotX, plotY + plotH); // y-axis
    
    // Y-axis label
    gc.push();
    gc.translate(plotX - 40, plotY + plotH/2);
    gc.rotate(-PI/2);
    gc.fill(0);
    gc.noStroke();
    gc.textAlign(CENTER, CENTER);
    gc.textSize(14);
    gc.text('Critical Acceleration (m/s²)', 0, 0);
    gc.pop();
    
    // X-axis label
    gc.fill(0);
    gc.noStroke();
    gc.textAlign(CENTER, TOP);
    gc.text('Fill Level (%)', plotX + plotW/2, plotY + plotH + 30);
    
    // Y-axis ticks and labels
    gc.stroke(200);
    gc.strokeWeight(1);
    gc.fill(0);
    gc.noStroke();
    gc.textAlign(RIGHT, CENTER);
    gc.textSize(11);
    
    for (let i = 0; i <= 5; i++) {
        const y = plotY + plotH - (i / 5) * plotH;
        const val = (i / 5) * maxCrit * 1.1;

        gc.stroke(200);
        gc.line(plotX, y, plotX + plotW, y);

        gc.noStroke();
        gc.text(val.toFixed(1), plotX - 10, y);
    }
    
    // X-axis ticks
    gc.textAlign(CENTER, TOP);
    for (let i = 0; i <= 10; i++) {
        const x = plotX + (i / 10) * plotW;
        const val = i * 10;

        gc.stroke(200);
        gc.line(x, plotY + plotH, x, plotY + plotH + 5);

        gc.noStroke();
        gc.text(val, x, plotY + plotH + 10);
    }
    
    // Draw curve
    gc.noFill();
    gc.stroke(0, 150, 255);
    gc.strokeWeight(3);
    gc.beginShape();
    for (let point of dataPoints) {
        const x = plotX + (point.fill / 100) * plotW;
        const y = plotY + plotH - (point.critAccel / (maxCrit * 1.1)) * plotH;
        gc.vertex(x, y);
    }
    gc.endShape();
    
    // Draw current fill level line
    gc.stroke(255, 165, 0);
    gc.strokeWeight(2);
    const currentX = plotX + (fillLevel / 100) * plotW;
    gc.line(currentX, plotY, currentX, plotY + plotH);
    
    // Draw optimal fill level line
    gc.stroke(0, 200, 0);
    gc.strokeWeight(2);
    gc.strokeWeight(2);
    const optimalX = plotX + (optimalFillLevel / 100) * plotW;
    gc.line(optimalX, plotY, optimalX, plotY + plotH);
    
    // Draw current force level line
    gc.stroke(255, 0, 0, 150);
    gc.strokeWeight(2);
    const forceY = plotY + plotH - (horizontalForce / (maxCrit * 1.1)) * plotH;
    gc.line(plotX, forceY, plotX + plotW, forceY);
    
    // Legend
    const legendY = plotY + plotH - 100;
    gc.textAlign(LEFT, CENTER);
    gc.textSize(12);
    
    gc.fill(0, 150, 255);
    gc.text('● Stability Curve', plotX + 20, legendY);
    
    gc.fill(255, 165, 0);
    gc.text('│ Current Fill (' + fillLevel.toFixed(0) + '%)', plotX + 20, legendY + 25);
    
    gc.fill(0, 200, 0);
    gc.text('│ Optimal Fill (' + optimalFillLevel.toFixed(1) + '%)', plotX + 20, legendY + 50);
    
    gc.fill(255, 0, 0);
    gc.text('─ Applied Force (' + horizontalForce.toFixed(1) + ' m/s²)', plotX + 20, legendY + 75);
}

function updateInfoPanel() {
    document.getElementById('com-height').textContent = centerOfMass.toFixed(2) + ' mm';
    document.getElementById('total-mass').textContent = totalMass.toFixed(2) + ' g';
    document.getElementById('tip-angle').textContent = (tippingAngle * 180 / Math.PI).toFixed(2) + '°';
    document.getElementById('crit-accel').textContent = criticalAcceleration.toFixed(2) + ' m/s²';
    document.getElementById('stability-factor').textContent = stabilityFactor.toFixed(2) + 'x';
    
    const statusDiv = document.getElementById('status-message');
    
    if (wouldTip) {
        statusDiv.innerHTML = '<div class="warning"><span class="warning-icon">⚠️</span><span>Can would tip over! Reduce force or adjust fill level.</span></div>';
    } else if (Math.abs(fillLevel - optimalFillLevel) < 5) {
        statusDiv.innerHTML = '<div class="optimal"><i class="fa-solid fa-circle-check icon"></i><span>Near optimal stability. This fill level maximizes resistance to tipping.</span></div>';
    } else {
        const direction = fillLevel < optimalFillLevel ? 'add' : 'remove';
        const amount = Math.abs(fillLevel - optimalFillLevel).toFixed(1);
        statusDiv.innerHTML = `<div class="status-tip"><i class="fa-solid fa-lightbulb icon"></i><span>For maximum stability, ${direction} ${amount}% of liquid to reach ${optimalFillLevel.toFixed(1)}% fill level.</span></div>`;
    }
}

function windowResized() {
    updateCanvasSizes();
}
