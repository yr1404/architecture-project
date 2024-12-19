/**
 *  Core CPU cache logic are implemented in this file.
 *  Includes all relevent functions and classes.
 *
 *   TODO:
 *     1) represent the color level incrementatally to see how "busy" a particular cell is
 *     2) USE LOCAL data to store the status of the simulation run so it can be resumed
 *
 */


var addressLength = 32; // js bitwise operations are always 32-bits

// CacheLine status flags
var FLAGS = {
    INVALID: 0, // invalid
    CLEAN: 1,   // valid, clean
    DIRTY: 2    // valid, dirty
};

// CPU Memory Operation
var OP = {
    READ: 0,
    WRITE: 1
};


//-----------------------------------------------
// Class: Represent each cache line/cell
//-----------------------------------------------
function CacheLine(set, way) {
    this.tag = 0;               // Tag of the line
    this.seq = 0;               // Sequence number
    this.flag = FLAGS.INVALID;  // Validity of data

    this.set = set;             // row index in the cache array (not the actual index bits)
    this.way = way;             // column index
    this.numAccess = 0;         // counter for keeping track of total access
}

CacheLine.prototype.isValid = function() {
    if (this.flag !== FLAGS.INVALID) return true;
    else return false;
}


//-----------------------------------------------
// Function: returns 2D array of CacheLines 
//-----------------------------------------------
function create2DCache(row, col) {
    var i, j;

    // Allocate sets (rows)
    var array = [];

    // Allocate ways (columns)
    for (i = 0; i < row; i++) {
        array[i] = [];
    }

    // Initialize with CacheLine objects
    for (i = 0; i < row; i++) {
        for (j = 0; j < col; j++) {
            array[i][j] = new CacheLine(i, j);
        }
    }

    return array;
};


//-----------------------------------------------
// Class: Cache
//        
// - LRU   replacement policy
// - WBWA  write       policy
//-----------------------------------------------
function Cache(cachesize, assoc, blocksize, perAccessCallBack) {

    var context = this;

    this.cachesize  = cachesize;
    this.assoc      = assoc;
    this.blocksize  = blocksize;

    if (typeof perAccessCallBack !== "undefined") {
        this.perAccessCallBack = perAccessCallBack;
    } else {
        this.perAccessCallBack = function() {};
    }

    var statistics = {
        read: 0,
        write: 0,
        readMiss: 0,
        writeMiss: 0,
        writeBack: 0,
        totalAccess: 0  // Keeps track of the total number of cache access, 
                        // Also used in LRU policy to find replacement block
    };

    this.stats = statistics;
    this.numSets = cachesize / (blocksize * assoc); // Find the number of sets needed

    // Calculate private cache parameters
    var numIndexBits = Math.log(this.numSets) / Math.log(2);            // Index bits: log2(numSets) give the number of index bits
    var numBlockOffsetBits = Math.log(this.blocksize) / Math.log(2);    // Block bits: log2(numSets) give the number of block bits
    var numTagBits = addressLength - numIndexBits - numBlockOffsetBits; // The rest of the address are the tag bits

    //console.log(numTagBits, numIndexBits, numBlockOffsetBits);
    
    console.time('create2DCache');  // start timer: profile the time to create the cache
    
    this.cache = create2DCache(this.numSets, this.assoc);

    console.timeEnd('create2DCache'); // end timer

    // 32-bit Address Breakdown
    //
    // -------------------------
    // |  Tag  | Index | Block |
    // -------------------------

    // ----- Private helper methods ----- //

    var getTag = function(addr) {
        var tag = (addr >> (numIndexBits + numBlockOffsetBits));
        return tag;
    };

    var getIndex = function(addr) {

        // 1)
        //     |  Tag  | Index | Block |
        // 
        //
        // 2) Right shift out the block offset bits
        //
        //     | 00000 |  Tag  | Index |
        // 
        //
        // 3) Mask to get index bits
        //
        //     | 00000 |  Tag  | Index |
        // &   | 00000 | 00000 | 11111 |
        // _____________________________
        //     | 00000 | 00000 | Index |
        //
        var tagAndIndex = (addr >> numBlockOffsetBits);
        return (tagAndIndex & (context.numSets - 1)); // returns only index bits
    };

    var getBlock = function(addr) {
        return (addr & (context.blocksize - 1));
    };

    var writeBack = function(addr) {
        statistics.writeBack++;
    }

    var getLRULine = function(addr) {

        var index = getIndex(addr);             // get index of the cache row/set
        var entry = 0;                          // the current column of the cache row/set
        var victimEntry = null;                 // the cache line to be evicted
        var lruCount = statistics.totalAccess;  // the least recently used count (initialized to current access number)

        // 1) If a block is invalid, put it there
        for (entry = 0; entry < context.assoc; entry++) {
            if (context.cache[index][entry].flag === FLAGS.INVALID) {
                // console.log("is invalid");
                return context.cache[index][entry];
            }
        }

        // 2) If no blocks are invalid, find the one least recently used
        for (entry = 0; entry < context.assoc; entry++) {

            // Look for the smallest sequence number
            if (context.cache[index][entry].seq <= lruCount) {
                victimEntry = context.cache[index][entry];
                lruCount = context.cache[index][entry].seq;
            }
        }

        return victimEntry;
    };

    // TODO: implement different replacment policy
    function findReplacementLine(addr) {
        return getLRULine(addr);
    };

    // Returns the CacheLine object if its found. If it isn't, 
    // its a miss, and null will be return
    function findCacheLine(addr) {
        var cacheLine = null;
        var index = getIndex(addr);
        var tag = getTag(addr);
        var column = 0;

        for (column = 0; column < context.assoc; column++) {
            if (context.cache[index][column].tag === tag) {
                cacheLine = context.cache[index][column];
                //console.log("hit");
                //console.log(cacheLine);
            }
        }
        return cacheLine;
    };


    // ----- Public Method: Memory Access ----- //
    var cacheHit = false;
    this.access = function(addr, op) {
        statistics.totalAccess++;

        if (op === 'w') {
            statistics.write++;
        } else {
            statistics.read++;
        }

        // 1) Try to find cache line
        var cacheLine = findCacheLine(addr);

        // Cache Hit
        if (cacheLine) {

            cacheHit = true;

            // Update the cacheline
            cacheLine.seq = statistics.totalAccess;

            // Write hit
            if (op === 'w') {
                // write the new data into the cache block and mark it dirty
                cacheLine.flag = FLAGS.DIRTY;
            }
            // Read hit: nothing is done, except returning the data
        }
        // Cache Miss
        else {

            cacheHit = false;

            // Find the replacement block
            cacheLine = findReplacementLine(addr);
            cacheLine.tag = getTag(addr);
            cacheLine.seq = statistics.totalAccess;

            if (cacheLine.flag === FLAGS.DIRTY) {
                writeBack(addr);
            }

            if (op === 'w') {
                statistics.writeMiss++;
                cacheLine.flag = FLAGS.DIRTY;
            } else {
                statistics.readMiss++;
                cacheLine.flag = FLAGS.CLEAN;
            }

        }

        //console.log("Original Address: " + addr.toString(2));

        // Invoke our callback with an object that wraps the data needed
        context.perAccessCallBack(
        {
            memOp: (op === 'w' ? 'Write' : 'Read'),
            hit: cacheHit,
            tagBits: getTag(addr),
            indexBits: getIndex(addr),
            blockBits: getBlock(addr),
            numTagBits: numTagBits,
            numIndexBits: numIndexBits,
            numBlockOffsetBits: numBlockOffsetBits,
            cacheLine: cacheLine
        });
    }

    this.getNumTagBits = function() {
        return numTagBits;
    };

    this.getNumIndexBits = function() {
        return numIndexBits;
    };

    this.getNumBlockOffsetBits = function() {
        return numBlockOffsetBits;
    };

};
