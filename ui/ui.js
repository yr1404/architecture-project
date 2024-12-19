//-----------------------------------------------
// Generate a table to represent the cache
//-----------------------------------------------
function generateCacheTable(tableContainerID, row, column) {

    var tableContainer = document.getElementById(tableContainerID);

    var panelHeader = false;
    if (panelHeader) {
        tableContainer.className = 'panel panel-default';

        // Create table heading
        var panelDiv = document.createElement('div');
        panelDiv.className = 'panel-heading';
        panelDiv.innerHTML = 'Cache';
        tableContainer.appendChild(panelDiv);
    }
    var table = document.createElement('table');


    // --------------- Create cache table header --------------- //
    var tableHead = document.createElement('thead');
    var tHeadRow = document.createElement('tr');

    for (var k = 0; k < column; k++) {
        var th = document.createElement('th');
        th.innerHTML = 'Line ' + k;
        tHeadRow.appendChild(th);
    }

    table.appendChild(tableHead);
    tableHead.appendChild(tHeadRow);


    // --------------- Create cache table body --------------- //
    var tableBody = document.createElement('tbody');
    table.appendChild(tableBody);

    for (var i = 0; i < row; i++) {
        var tr = document.createElement('tr');
        tableBody.appendChild(tr);

        for (var j = 0; j < column; j++) {
            var td = document.createElement('td'); // create table data cell
            var cellNode = document.createElement('div'); // create a node inside each table cell
            cellNode.setAttribute('id', i + '_' + j);
            cellNode.setAttribute('data-original-title', 'Cell: ' + i + ', ' + j); // title of bootstrap popover
            cellNode.setAttribute('data-content', '-'); // content of popover
            cellNode.setAttribute('data-row', i); // set/row index
            cellNode.setAttribute('data-col', j); // way/column index
            cellNode.setAttribute('data-placement', 'right'); // setting to show popover at the bottom
            cellNode.setAttribute('rel', 'popover');

            cellNode.innerHTML = '<div class="cacheline_tag">Empty </div>'; // + 
            //'<p class="cacheline_dirty"> Dirty: - </p>';

            td.appendChild(cellNode);
            tr.appendChild(td);
        }
    }

    table.className = 'table table-bordered table-striped';
    tableContainer.appendChild(table);

    // $('td div').popover({ trigger: 'hover' });

    // // Assign a onclick that changes the color of the cell
    // $('td').click(function() {
    //     $(this).toggleClass('red-cell');
    // });

}

//-----------------------------------------------
// Helper function to pad zeros in front 
//-----------------------------------------------
function pad(num, size) {
    var s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
}

//-----------------------------------------------
// Updates the parameter html table
//-----------------------------------------------
function cacheParameterUpdate() {
    document.getElementById('cache_size').innerHTML = cacheSize + " bytes";
    document.getElementById('associativity').innerHTML = assoc;
    document.getElementById('block_size').innerHTML = blockSize + " bytes";
    document.getElementById('write_policy').innerHTML = "WBWA";
    document.getElementById('replace_policy').innerHTML = "LRU";
}

//-----------------------------------------------
// Callback function do stuff to cache
// table after every access
//-----------------------------------------------
function cacheTableUpdate(data) {

    // Update the last memory access table
    document.getElementById('op').innerHTML = data.memOp;
    document.getElementById('tag').innerHTML = pad(data.tagBits.toString(2), data.numTagBits);
    document.getElementById('index').innerHTML = pad(data.indexBits.toString(2), data.numIndexBits);
    document.getElementById('block').innerHTML = pad(data.blockBits.toString(2), data.numBlockOffsetBits);

    // Now update the main cache table
    var rowIndex = data.cacheLine.set;
    var colIndex = data.cacheLine.way;
    var table = $("table tbody tr:nth-child(" + (rowIndex+1) + ") td:nth-child(" + (colIndex+1) + ") div");
    // table = $('#' + rowIndex + '_' + colIndex);

    table.html('0x' + data.tagBits.toString(16));

    var properties = {
       color : (data.hit ? 'green' : 'red')
    };

    table.pulse(properties, {duration: 950});

    //console.log(table.length);

    //document.getElementById(rowIndex + '_' + colIndex).innerHTML = 'huh';
    //document.getElementById('1_2').innerHTML = 'huh';
}