const SUBJECT_LIST = [
    "แบบฝึกหัด OS", "รายงาน Database", "สรุป English", 
    "แบบฝึกหัด Math", "โครงงาน Network", "แบบฝึกหัด Data Structures"
];

const COLOR_PALETTE = ["#4299e1", "#48bb78", "#ed8936", "#9f7aea", "#f56565", "#38b2ac"];

let currentTasks = [];

function getPidNum(pid) {
    return parseInt(pid.replace('P', ''), 10);
}

// 1. ฟังก์ชันสุ่มงาน
function generateRandomTasks() {
    const count = parseInt(document.getElementById('taskCount').value, 10);
    let subjects = [...SUBJECT_LIST].sort(() => 0.5 - Math.random()).slice(0, count);

    let ats = Array.from({length: count}, () => Math.floor(Math.random() * 11));
    if (!ats.includes(0)) {
        ats[Math.floor(Math.random() * count)] = 0;
    }

    let bts = Array.from({length: count}, () => Math.floor(Math.random() * 8) + 1);

    currentTasks = [];
    for (let i = 0; i < count; i++) {
        currentTasks.push({
            pid: `P${i + 1}`,
            name: subjects[i],
            at: ats[i],
            bt: bts[i],
            color: COLOR_PALETTE[i % COLOR_PALETTE.length]
        });
    }

    renderTaskInputTable();
    document.getElementById('resultsSection').style.display = 'none';
}

function renderTaskInputTable() {
    const tbody = document.getElementById('taskTableBody');
    tbody.innerHTML = '';
    currentTasks.forEach(task => {
        tbody.innerHTML += `
            <tr>
                <td><span class="badge" style="background:${task.color}">${task.pid}</span></td>
                <td style="text-align: left; padding-left: 20px;">${task.name}</td>
                <td>${task.at}</td>
                <td>${task.bt}</td>
            </tr>
        `;
    });
}

// 2. FCFS Algorithm
function solveFCFS(tasks) {
    let procs = tasks.map(t => ({...t}));
    procs.sort((a, b) => a.at - b.at || getPidNum(a.pid) - getPidNum(b.pid));

    let currentTime = 0;
    let gantt = [];

    procs.forEach(p => {
        if (currentTime < p.at) {
            gantt.push({ pid: "Idle", start: currentTime, end: p.at, color: "#edf2f7" });
            currentTime = p.at;
        }
        let start = currentTime;
        currentTime += p.bt;
        p.ct = currentTime;
        p.tat = p.ct - p.at;
        p.wt = p.tat - p.bt;
        gantt.push({ pid: p.pid, start: start, end: currentTime, color: p.color });
    });

    return { procs, gantt };
}

// 3. SJF (Non-Preemptive) Algorithm
function solveSJF(tasks) {
    let procs = tasks.map(t => ({...t}));
    let completed = [];
    let gantt = [];
    let currentTime = 0;
    const n = procs.length;

    while (completed.length < n) {
        let available = procs.filter(p => p.at <= currentTime && !completed.some(c => c.pid === p.pid));
        
        if (available.length > 0) {
            available.sort((a, b) => a.bt - b.bt || a.at - b.at || getPidNum(a.pid) - getPidNum(b.pid));
            let best = available[0];
            let start = currentTime;
            currentTime += best.bt;
            best.ct = currentTime;
            best.tat = best.ct - best.at;
            best.wt = best.tat - best.bt;
            completed.push(best);
            gantt.push({ pid: best.pid, start: start, end: currentTime, color: best.color });
        } else {
            let remaining = procs.filter(p => !completed.some(c => c.pid === p.pid));
            let nextAt = Math.min(...remaining.map(p => p.at));
            gantt.push({ pid: "Idle", start: currentTime, end: nextAt, color: "#edf2f7" });
            currentTime = nextAt;
        }
    }

    return { procs: completed, gantt };
}

// 4. Round Robin (RR) Algorithm
function solveRR(tasks, q) {
    let procs = tasks.map(t => ({...t, remainingBt: t.bt}));
    let unvisited = [...procs].sort((a, b) => a.at - b.at || getPidNum(a.pid) - getPidNum(b.pid));
    
    let readyQueue = [];
    let completed = [];
    let gantt = [];
    let currentTime = 0;

    while (completed.length < procs.length) {
        let arrivals = unvisited.filter(p => p.at <= currentTime);
        arrivals.forEach(p => {
            readyQueue.push(p);
            unvisited = unvisited.filter(u => u.pid !== p.pid);
        });

        if (readyQueue.length === 0) {
            if (unvisited.length > 0) {
                let nextAt = Math.min(...unvisited.map(p => p.at));
                gantt.push({ pid: "Idle", start: currentTime, end: nextAt, color: "#edf2f7" });
                currentTime = nextAt;
                let newArrivals = unvisited.filter(p => p.at <= currentTime);
                newArrivals.forEach(p => {
                    readyQueue.push(p);
                    unvisited = unvisited.filter(u => u.pid !== p.pid);
                });
            } else {
                break;
            }
        }

        let curr = readyQueue.shift();
        let execTime = Math.min(curr.remainingBt, q);
        let start = currentTime;
        currentTime += execTime;
        curr.remainingBt -= execTime;
        gantt.push({ pid: curr.pid, start: start, end: currentTime, color: curr.color });

        // นำงานใหม่ที่เข้าตรงเวลาครบ q เข้าคิวก่อนงานเดิม
        let newArrivals = unvisited.filter(p => p.at <= currentTime);
        newArrivals.sort((a, b) => a.at - b.at || getPidNum(a.pid) - getPidNum(b.pid));
        newArrivals.forEach(p => {
            readyQueue.push(p);
            unvisited = unvisited.filter(u => u.pid !== p.pid);
        });

        if (curr.remainingBt > 0) {
            readyQueue.push(curr);
        } else {
            curr.ct = currentTime;
            curr.tat = curr.ct - curr.at;
            curr.wt = curr.tat - curr.bt;
            completed.push(curr);
        }
    }

    return { procs: completed, gantt };
}

// วาด Gantt Chart
function renderGantt(containerId, ganttData) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    ganttData.forEach((item, index) => {
        const block = document.createElement('div');
        block.className = `gantt-block ${item.pid === 'Idle' ? 'idle' : ''}`;
        block.style.flex = (item.end - item.start);
        if (item.pid !== 'Idle') {
            block.style.backgroundColor = item.color;
            block.style.color = '#fff';
        }
        block.innerHTML = `
            ${index === 0 ? `<span class="start-marker">${item.start}</span>` : ''}
            <span>${item.pid}</span>
            <span class="time-marker">${item.end}</span>
        `;
        container.appendChild(block);
    });
}

// แสดงตารางผลลัพธ์
function renderResultTable(tableId, summaryId, procs) {
    procs.sort((a, b) => getPidNum(a.pid) - getPidNum(b.pid));
    
    const tbody = document.querySelector(`#${tableId} tbody`);
    tbody.innerHTML = '';

    let totalTat = 0;
    let totalWt = 0;

    procs.forEach(p => {
        totalTat += p.tat;
        totalWt += p.wt;
        tbody.innerHTML += `
            <tr>
                <td><span class="badge" style="background:${p.color}">${p.pid}</span></td>
                <td>${p.at}</td>
                <td>${p.bt}</td>
                <td>${p.ct}</td>
                <td>${p.tat}</td>
                <td>${p.wt}</td>
            </tr>
        `;
    });

    const avgTat = (totalTat / procs.length).toFixed(2);
    const avgWt = (totalWt / procs.length).toFixed(2);

    document.getElementById(summaryId).innerHTML = `
        <strong>สรุปผลการจัดตาราง:</strong> ค่าเฉลี่ย Turnaround Time (TAT) = <strong>${avgTat}</strong> หน่วย | 
        ค่าเฉลี่ย Waiting Time (WT) = <strong>${avgWt}</strong> หน่วย
    `;
}

// ฟังก์ชันวาดแผนภูมิแท่งเปรียบเทียบ WT เฉลี่ยตามหน้า 5
function renderComparisonChart(fcfsWt, sjfWt, rrWt) {
    const chart = document.getElementById('wtComparisonChart');
    const maxVal = Math.max(fcfsWt, sjfWt, rrWt, 1);
    const chartHeightPx = 130;

    const fcfsHeight = (fcfsWt / maxVal) * chartHeightPx;
    const sjfHeight = (sjfWt / maxVal) * chartHeightPx;
    const rrHeight = (rrWt / maxVal) * chartHeightPx;

    chart.innerHTML = `
        <div class="bar-group">
            <div class="bar-value">${fcfsWt.toFixed(2)}</div>
            <div class="bar bar-fcfs" style="height: ${fcfsHeight}px;"></div>
            <div class="bar-label">FCFS</div>
        </div>
        <div class="bar-group">
            <div class="bar-value">${sjfWt.toFixed(2)}</div>
            <div class="bar bar-sjf" style="height: ${sjfHeight}px;"></div>
            <div class="bar-label">SJF</div>
        </div>
        <div class="bar-group">
            <div class="bar-value">${rrWt.toFixed(2)}</div>
            <div class="bar bar-rr" style="height: ${rrHeight}px;"></div>
            <div class="bar-label">RR</div>
        </div>
    `;

    let minWt = Math.min(fcfsWt, sjfWt, rrWt);
    let bestAlgo = "";
    if (minWt === sjfWt) bestAlgo = "SJF";
    else if (minWt === fcfsWt) bestAlgo = "FCFS";
    else bestAlgo = "RR";

    document.getElementById('chartCaptionText').innerText = 
        `ภาพเปรียบเทียบ WT เฉลี่ยของตัวอย่างนี้ SJF = ${sjfWt.toFixed(2)}, FCFS = ${fcfsWt.toFixed(2)} และ RR = ${rrWt.toFixed(2)} หน่วย ` +
        `${bestAlgo} รอน้อยที่สุดในโจทย์นี้ แต่ยังสรุปไม่ได้ว่าจะดีที่สุดในทุกโจทย์ ส่วน RR ช่วยแบ่งโอกาสเริ่มทำงาน แม้ WT เฉลี่ยอาจสูงกว่า`;
}

// ฟังก์ชันคำนวณทั้งหมด
function calculateAll() {
    if (currentTasks.length === 0) {
        alert("กรุณาสุ่มโจทย์ก่อน!");
        return;
    }

    const qInput = document.getElementById('timeQuantum');
    const q = parseInt(qInput.value, 10);
    if (isNaN(q) || q < 1 || q > 4) {
        alert("กรุณากรอก Time Quantum (q) เป็นจำนวนเต็มระหว่าง 1 - 4 เท่านั้น");
        return;
    }

    // คำนวณ FCFS
    const fcfs = solveFCFS(currentTasks);
    renderGantt('fcfsGantt', fcfs.gantt);
    renderResultTable('fcfsTable', 'fcfsSummary', fcfs.procs);

    // คำนวณ SJF
    const sjf = solveSJF(currentTasks);
    renderGantt('sjfGantt', sjf.gantt);
    renderResultTable('sjfTable', 'sjfSummary', sjf.procs);

    // คำนวณ RR
    const rr = solveRR(currentTasks, q);
    renderGantt('rrGantt', rr.gantt);
    renderResultTable('rrTable', 'rrSummary', rr.procs);

    // คำนวณ WT เฉลี่ยเพื่อส่งค่าวาดแผนภูมิเปรียบเทียบ
    const fcfsAvgWt = fcfs.procs.reduce((sum, p) => sum + p.wt, 0) / fcfs.procs.length;
    const sjfAvgWt = sjf.procs.reduce((sum, p) => sum + p.wt, 0) / sjf.procs.length;
    const rrAvgWt = rr.procs.reduce((sum, p) => sum + p.wt, 0) / rr.procs.length;

    renderComparisonChart(fcfsAvgWt, sjfAvgWt, rrAvgWt);

    document.getElementById('resultsSection').style.display = 'block';
}

// ผูก Event Listeners
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnRandom').addEventListener('click', generateRandomTasks);
    document.getElementById('btnCalculate').addEventListener('click', calculateAll);
    document.getElementById('btnPrint').addEventListener('click', () => window.print());
    
    generateRandomTasks();
});