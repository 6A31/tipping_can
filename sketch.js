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

// Calculated values
let centerOfMass;
let totalMass;
let tippingAngle;
let criticalAcceleration;
let stabilityFactor;
let wouldTip = false;
let optimalFillLevel = 0;

function setup() {
    let canvas = createCanvas(1340, 600);
    canvas.parent('canvas-container');
    
    // Set up event listeners
    setupControls();
    
    // Calculate optimal fill level
    calculateOptimalFillLevel();
    
    // Initial calculation
    updatePhysics();
}

function draw() {
    background(240, 245, 255);
    
    // Update physics
    updatePhysics();
    
    // Draw main visualization
    push();
    translate(300, 500);
    drawTable();
    drawCan();
    if (showPivot) drawPivotPoint();
    if (showCOM) drawCenterOfMass();
    if (showForce) drawForceVectors();
    pop();
    
    // Draw stability graph
    if (showGraph) {
        drawStabilityGraph();
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
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
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

function drawTable() {
    // Draw table surface
    stroke(80);
    strokeWeight(4);
    line(-200, 0, 400, 0);
    
    // Hatch marks to show infinite friction
    for (let x = -200; x <= 400; x += 20) {
        line(x, 0, x - 10, 10);
    }
}

function drawCan() {
    const h = canHeight * SCALE;
    const r = canRadius * SCALE;
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
    textSize(16);
    textStyle(BOLD);
    text(spec.name, 0, -h * 0.6);
    
    // Draw percentage if not full
    if (fillLevel < 100) {
        textSize(20);
        fill(255, 255, 0);
        text(fillLevel.toFixed(0) + '%', 0, -h * 0.4);
    }
}

function drawCenterOfMass() {
    const comY = -centerOfMass * SCALE;
    
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
    const r = canRadius * SCALE;
    line(0, comY, r, comY);
    line(0, comY, r, 0);
}

function drawPivotPoint() {
    // Draw the pivot point (edge of can base)
    const r = canRadius * SCALE;
    
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
    const h = canHeight * SCALE;
    const comY = -centerOfMass * SCALE;
    
    // Scale factor for force arrows
    const forceScale = 10;
    
    // Draw horizontal force (train acceleration)
    const horizontalLength = horizontalForce * forceScale;
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
        const r = canRadius * SCALE;
        arc(r, 0, 60, 60, -PI/2, -PI/2 + tippingAngle);
        
        fill(255, 0, 0);
        noStroke();
        textAlign(LEFT, CENTER);
        textSize(12);
        text('⚠️ TIPPING!', r + 40, -20);
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
    const graphX = 700;
    const graphY = 50;
    const graphW = 600;
    const graphH = 500;
    
    // Background
    fill(255, 255, 255, 230);
    stroke(100);
    strokeWeight(2);
    rect(graphX, graphY, graphW, graphH, 10);
    
    // Title
    fill(0);
    noStroke();
    textAlign(CENTER, TOP);
    textSize(18);
    textStyle(BOLD);
    text('Stability Analysis: Critical Acceleration vs Fill Level', graphX + graphW/2, graphY + 10);
    
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
    const plotX = graphX + 60;
    const plotY = graphY + 60;
    const plotW = graphW - 100;
    const plotH = graphH - 120;
    
    stroke(0);
    strokeWeight(2);
    line(plotX, plotY + plotH, plotX + plotW, plotY + plotH); // x-axis
    line(plotX, plotY, plotX, plotY + plotH); // y-axis
    
    // Y-axis label
    push();
    translate(plotX - 40, plotY + plotH/2);
    rotate(-PI/2);
    fill(0);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(14);
    text('Critical Acceleration (m/s²)', 0, 0);
    pop();
    
    // X-axis label
    fill(0);
    noStroke();
    textAlign(CENTER, TOP);
    text('Fill Level (%)', plotX + plotW/2, plotY + plotH + 30);
    
    // Y-axis ticks and labels
    stroke(200);
    strokeWeight(1);
    fill(0);
    noStroke();
    textAlign(RIGHT, CENTER);
    textSize(11);
    
    for (let i = 0; i <= 5; i++) {
        const y = plotY + plotH - (i / 5) * plotH;
        const val = (i / 5) * maxCrit * 1.1;
        
        stroke(200);
        line(plotX, y, plotX + plotW, y);
        
        noStroke();
        text(val.toFixed(1), plotX - 10, y);
    }
    
    // X-axis ticks
    textAlign(CENTER, TOP);
    for (let i = 0; i <= 10; i++) {
        const x = plotX + (i / 10) * plotW;
        const val = i * 10;
        
        stroke(200);
        line(x, plotY + plotH, x, plotY + plotH + 5);
        
        noStroke();
        text(val, x, plotY + plotH + 10);
    }
    
    // Draw curve
    noFill();
    stroke(0, 150, 255);
    strokeWeight(3);
    beginShape();
    for (let point of dataPoints) {
        const x = plotX + (point.fill / 100) * plotW;
        const y = plotY + plotH - (point.critAccel / (maxCrit * 1.1)) * plotH;
        vertex(x, y);
    }
    endShape();
    
    // Draw current fill level line
    stroke(255, 165, 0);
    strokeWeight(2);
    const currentX = plotX + (fillLevel / 100) * plotW;
    line(currentX, plotY, currentX, plotY + plotH);
    
    // Draw optimal fill level line
    stroke(0, 200, 0);
    strokeWeight(2);
    strokeWeight(2);
    const optimalX = plotX + (optimalFillLevel / 100) * plotW;
    line(optimalX, plotY, optimalX, plotY + plotH);
    
    // Draw current force level line
    stroke(255, 0, 0, 150);
    strokeWeight(2);
    const forceY = plotY + plotH - (horizontalForce / (maxCrit * 1.1)) * plotH;
    line(plotX, forceY, plotX + plotW, forceY);
    
    // Legend
    const legendY = plotY + plotH - 100;
    textAlign(LEFT, CENTER);
    textSize(12);
    
    fill(0, 150, 255);
    text('● Stability Curve', plotX + 20, legendY);
    
    fill(255, 165, 0);
    text('│ Current Fill (' + fillLevel.toFixed(0) + '%)', plotX + 20, legendY + 25);
    
    fill(0, 200, 0);
    text('│ Optimal Fill (' + optimalFillLevel.toFixed(1) + '%)', plotX + 20, legendY + 50);
    
    fill(255, 0, 0);
    text('─ Applied Force (' + horizontalForce.toFixed(1) + ' m/s²)', plotX + 20, legendY + 75);
}

function updateInfoPanel() {
    document.getElementById('com-height').textContent = centerOfMass.toFixed(2) + ' mm';
    document.getElementById('total-mass').textContent = totalMass.toFixed(2) + ' g';
    document.getElementById('tip-angle').textContent = (tippingAngle * 180 / Math.PI).toFixed(2) + '°';
    document.getElementById('crit-accel').textContent = criticalAcceleration.toFixed(2) + ' m/s²';
    document.getElementById('stability-factor').textContent = stabilityFactor.toFixed(2) + 'x';
    
    const statusDiv = document.getElementById('status-message');
    
    if (wouldTip) {
        statusDiv.innerHTML = '<div class="warning">⚠️ CAN WOULD TIP OVER! Reduce force or adjust fill level.</div>';
    } else if (Math.abs(fillLevel - optimalFillLevel) < 5) {
        statusDiv.innerHTML = '<div class="optimal">✓ Near optimal stability! This fill level maximizes resistance to tipping.</div>';
    } else {
        const direction = fillLevel < optimalFillLevel ? 'add' : 'remove';
        const amount = Math.abs(fillLevel - optimalFillLevel).toFixed(1);
        statusDiv.innerHTML = `<div style="background: rgba(255, 165, 0, 0.2); border-left: 4px solid orange; padding: 15px; border-radius: 8px; margin-top: 15px;">
            ℹ️ For maximum stability, ${direction} ${amount}% of liquid to reach ${optimalFillLevel.toFixed(1)}% fill level.
        </div>`;
    }
}
