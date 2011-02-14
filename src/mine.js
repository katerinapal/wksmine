BoxState = {
    COVERED: "covered",
    OPENED: "opened",
    BOMBED: "bombed",
    FLAGED: "flaged"
};

function BoxInfo(row, col){
    this.row = row;
    this.col = col;
    this.hasMine = false;
    this.surrounding = 0;
    this.state = BoxState.COVERED;
}

DEFAULTS = {
    rows: 12,
    cols: 12,
    mines: 10,
    makeModel: function(){
        return new MineModel(this.rows, this.cols, this.mines);
    }
};

function MineModel(rows, cols, mines){
    this.infos = [];
    for (var r = 0; r < rows; r++) {
        curRow = [];
        this.infos.push(curRow);
        for (var c = 0; c < cols; c++) {
            curRow.push(new BoxInfo(r, c));
        }
    }
    
    // TODO: add mine generation.
    
    this.listeners = [];
}

MineModel.prototype.generateMines = function(){
    posses = [];
    for (var r = 0; r < this.rows; r++) {
        for (var c = 0; c < this.cols; c++) {
            posses.push(Math.random(), [r, c]);
        }
    }
    posses.sort(function(p){
        return p[0];
    });
    
    for (var i in posses) {
        r = i[1][0];
        c = i[1][1];
        bi = this.infos[r][c];
        bi.hasMine = i < this.mines;
    }
};

MineModel.prototype.uncover = function(row, col){
    bi = this.infos[row][col];
    switch (bi.state) {
        case BoxState.COVERED:
            if (bi.hasMine) {
                bi.state = BoxState.BOMBED;
            }
            else {
                bi.state = BoxState.OPENED;
            }
            
            for (var i in this.listeners) {
                listeners[i].stateChanged(row, col);
            }
            
            break;
    }
};

theModel = DEFAULTS.makeModel();

theView = {
	stateChanged : function(row, col) {
		alert(""+row+","+col);
	}
};

$(document).ready(function() {
	
});
