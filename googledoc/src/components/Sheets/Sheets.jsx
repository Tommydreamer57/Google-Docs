import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import HotTable from 'react-handsontable';
import io from 'socket.io-client';
import SheetsHeader from './SheetsHeader/SheetsHeader.jsx';
import DropDownMenu from 'material-ui/DropDownMenu';
import MenuItem from 'material-ui/MenuItem';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import RaisedButton from 'material-ui/RaisedButton';

let socket;


class Sheets extends Component {
  constructor(){
    super();
    this.state={
      rows: 50,
      fillData:[['White', 'Canary'],['is so much','better than'], ['Black', 'Canary']],
      // fillStyles:[[{bg:' bg-blue',color:'white'}, {bg:'bg-gray',color:'yellow'}]],
      columns: 50,
      table: [],
      styles: [],
      changeLog:[],
      undoLog:[],
      filled: false,
      zoom: 1.00,
      activeSelection:[null,null,null,null],
      latestColor: 'black',
      latestBg: 'white',
    }
    
    this.handleChange = this.handleChange.bind(this)
    this.handleUndo = this.handleUndo.bind(this)
    this.handleRedo = this.handleRedo.bind(this)
    this.handleZoom = this.handleZoom.bind(this)
    this.handleSelect = this.handleSelect.bind(this)
    this.handleDataType = this.handleDataType.bind(this)
    this.getStyles = this.getStyles.bind(this)
    this.handleColorChange = this.handleColorChange.bind(this)
    this.handleBgChange = this.handleBgChange.bind(this)
  }

  //On mount, take fillData info from state and put into a 50x50 matrix, then push this matrix to state as table
  componentDidMount(){
    let tempTable = [];
    for (let i=0;i<this.state.rows;i++){
      let row = [];
      for (let j=0;j<this.state.columns;j++){
        row.push('')
      }
      tempTable.push(row);
    }
    
    if (this.state.fillData){
      let fillData=this.state.fillData
      for (let k=0;k<fillData.length;k++){
        for (let l=0;l<fillData[k].length;l++){
          tempTable[k].splice(l,1,fillData[k][l])
        }
        
      }
    }
    this.setState({table:tempTable});

    let tempStyles = [];
    for (let i=0;i<this.state.rows;i++){
      let row = [];
      for (let j=0;j<this.state.columns;j++){
        row.push({bg:'',color:''})
      }
      tempStyles.push(row);
    }
    
    if (this.state.fillStyles){
      let fillStyles=this.state.fillStyles
      for (let k=0;k<fillStyles.length;k++){
        for (let l=0;l<fillStyles[k].length;l++){
          tempStyles[k].splice(l,1,fillStyles[k][l])
        }
        
      }
    }
    this.setState({styles:tempStyles})



    socket = io('http://localhost:3001');
    socket.on('dataIn', data=>{
      this.setState({table:data});
    })
  }
  
  // When user makes a change, it is added to a change log. this.state.table is updated by HotTable (or by componentDidMount - not really sure)
  handleChange = function(changes){
    if (changes){      
      let tempChangeLog = this.state.changeLog.slice();
      tempChangeLog.push(changes[0]);
      this.setState({changeLog:tempChangeLog})

      socket.emit('dataOut', this.state.table)
    }
  }
  
  // When a user selects 'undo', the most recent change is popped off the change log and put onto an undo log.
  handleUndo(){
    if(this.state.changeLog[0]){
      let tempChangeLog = this.state.changeLog;
      let lastItem = tempChangeLog.pop();
      let tempUndoLog = this.state.undoLog;
      tempUndoLog.push(lastItem);
      let row = lastItem[0][0];
      let column = lastItem[0][1];
      let tempTable = this.state.table.slice();
      tempTable[row].splice(column,1,lastItem[0][2]);
      this.setState({table: tempTable});
    }
  }
  // Opposite of undo
  handleRedo(){
    if(this.state.undoLog[0]){
      let tempUndoLog = this.state.undoLog;
      let nextItem = tempUndoLog.pop();
      let tempChangeLog = this.state.changeLog;
      tempChangeLog.push(nextItem)
      let row = nextItem[0][0];
      let column = nextItem[0][1];
      let tempTable = this.state.table.slice();
      tempTable[row].splice(column,1,nextItem[0][3])
      this.setState({table: tempTable})
    }
  }
  // Handle undo - handsontable does not do well with zoom changes. The column headers will move weird on scroll.
  handleZoom(event, index, zoomVal){
    this.setState({zoom:zoomVal})
  }
  // Push current selection to state so we can change properties of only these cells.
  handleSelect(rStart, cStart, rEnd, cEnd){
    if (rStart > rEnd) {
      let temp = rStart;
      rStart = rEnd;
      rEnd = temp;
    }
    if (cStart > cEnd) {
      let temp = cStart;
      cStart = cEnd;
      cEnd = temp;
    }
    this.setState({activeSelection: [rStart, cStart, rEnd, cEnd]})
  }
  // Change selected cells to dollar format (also changes from number to string)
  handleDataType(type){
    let tempTable = this.state.table.slice();
    let selected = this.state.activeSelection.slice();
    if (selected[0]){
      for (let i = selected[0]; i <= selected[2]; i++){
        for (let j = selected[1]; j <= selected[3]; j++){
          let value = tempTable[i][j];
          let valLength = value.split('').length;
          if (value.split('')[0]==='$'){
            value = value.split('');
            value.shift();
            value = value.join('');
          } else if (value.split('')[valLength - 1] === '%'){
            value = value.split('')
            value.pop()
            value = value.join('');
            value = Number(value)/100;
          }
          if ((typeof value === 'string' || typeof value === 'number') && Number(value)==value && value !== ''){ 
            value = (type === 'percent' ? Number(value)*100 : value);
            value = value.toString().split('');
            
            if (value.indexOf('.') !== -1 && value.indexOf('.') == value.lastIndexOf('.')){

              let decimals = value.length - 1 - value.lastIndexOf('.');
              if (decimals < 2){
                for(let k=0;k<decimals;k++){
                  value.push('0')
                }
              } else if (decimals > 2){
                for ( let l=decimals;l>2; l--){
                  value.pop()
                }
              }
            } else value.push('.00')
            value = (type === 'dollars' ? '$' + value.join('') : type === 'percent' ? value.join('') + '%' : value);
            tempTable[i].splice(j,1,value)
          }
        }
      }
      this.setState({table:tempTable})
    }
  }
  handleColorChange(newColor){
    let selected = this.state.activeSelection.slice();
    if (selected[0]){
      let tempStyles = this.state.styles.slice();
      for (let i=selected[0];i<=selected[2];i++){
        for (let j=selected[1];j<=selected[3];j++){
          let bg = tempStyles[i][j].bg
          tempStyles[i].splice(j,1,{bg:bg,color:newColor})
        }
      }
      this.setState({styles: tempStyles, latestColor: newColor})
    }
  }
  handleBgChange(newBgColor){
    let selected = this.state.activeSelection.slice();
    if (selected[0]){
      let tempStyles = this.state.styles.slice();
      for (let i=selected[0];i<=selected[2];i++){
        for (let j=selected[1];j<=selected[3];j++){
          let color = tempStyles[i][j].color
          tempStyles[i].splice(j,1,{color:color,bg:newBgColor})
        }
      }
      this.setState({styles: tempStyles, latestBg: newBgColor})
    }
    
  }
  getStyles(row,col){
    let bg = this.state.styles[row][col].bg;
    let color = this.state.styles[row][col].color;
    return (bg + ' ' + color);
  }

  render() {
    return (
      <MuiThemeProvider>
      <div className='sheets'>
        <SheetsHeader />
        <div className='menu-bar'>

          <div className='undo-redo'>
            <div className='undo'  onClick={()=>this.handleUndo()}>
              <i className='fa fa-undo'></i>
            </div>
            <div className='redo'  onClick={()=>this.handleRedo()}>
              <i className='fa fa-repeat'></i>
            </div>
          </div>
          <div>
          <DropDownMenu value={this.state.zoom} onChange={this.handleZoom} className='zoom-select'>
            <MenuItem value={.50} primaryText="50%" />
            <MenuItem value={.75} primaryText="75%" />
            <MenuItem value={.90} primaryText="90%" />
            <MenuItem value={1.00} primaryText="100%" />
            <MenuItem value={1.25} primaryText="125%" />
            <MenuItem value={1.5} primaryText="150%" />
            <MenuItem value={2.00} primaryText="200%" />
          </DropDownMenu>
          </div>
          

          <div className='data-type-select'>
            <div className='dollars' onClick={()=>this.handleDataType('dollars')}>$</div>
            <div className='percent'onClick={()=>this.handleDataType('percent')}>%</div>
            <div className='less'onClick={()=>this.handleDataType('less')}>{'.0<'}</div>
            <div className='more'onClick={()=>this.handleDataType('more')}>{'.0>'}</div> 
          </div>
         {/* <div className='color-select'>
            <select onChange={(event)=>this.handleColorChange(event.target.value)} defaultValue={'black'}>
              <option value={'black'}>black</option>
              <option value={'red'}>red</option>
              <option value={'orange'}>orange</option>
              <option value={'yellow'}>yellow</option>
              <option value={'green'}>green</option>
              <option value={'cyan'}>cyan</option>
              <option value={'cornflowerblue'}>cornflower blue</option>
              <option value={'blue'}>blue</option>
              <option value={'purple'}>purple</option>
              <option value={'magenta'}>magenta</option>
              <option value={'white'}>white</option>
            </select>
          </div> */}
          <div className='color-select'>
            <DropDownMenu value={this.state.latestColor} onChange={(event, key, value)=>this.handleColorChange(value)}  selectedMenuItemStyle={ {backgroundColor:'#f5f5f5', color:this.state.latestColor}} style={{color:this.state.latestColor,backgroundColor: 'red'}}>
              <MenuItem value={'black'} primaryText="black" style={ {color: 'black'}} />
              <MenuItem value={'red'} primaryText="red" style={ {color: 'red'}}/>
              <MenuItem value={'orange'} primaryText="orange" style={ {color: 'orange'}}/>
              <MenuItem value={'yellow'} primaryText="yellow" style={ {color: 'yellow'}}/>
              <MenuItem value={'lime'} primaryText="green" style={ {color: '#51ff3f'}}/>
              <MenuItem value={'cyan'} primaryText="cyan" style={ {color: 'cyan'}}/>
              <MenuItem value={'cornflowerblue'} primaryText="cornflowerblue" style={ {color: 'cornflowerblue'}}/>
              <MenuItem value={'blue'} primaryText="blue" style={ {color: 'blue'}}/>
              <MenuItem value={'purple'} primaryText="purple" style={ {color: 'purple'}}/>
              <MenuItem value={'magenta'} primaryText="magenta" style={ {color: 'magenta'}}/>
              <MenuItem value={'white'} primaryText="white" style={ {color: 'gray'}}/>
            </DropDownMenu>
          </div>  
          <div className='bg-select'>
            <DropDownMenu value={this.state.latestBg} onChange={(event, key, value)=>this.handleBgChange(value)}  selectedMenuItemStyle={{ color:'lightgray'}}>
              <MenuItem value={'bg-white'} primaryText="white" style={ {backgroundColor: 'white', color: 'black'}}/>
              <MenuItem value={'bg-red'} primaryText="red" style={ {backgroundColor: 'red', color: 'white'}}/>
              <MenuItem value={'bg-orange'} primaryText="orange" style={ {backgroundColor: 'orange', color: 'white'}}/>
              <MenuItem value={'bg-yellow'} primaryText="yellow" style={ {backgroundColor: 'yellow', color: 'black'}}/>
              <MenuItem value={'bg-lime'} primaryText="green" style={ {backgroundColor: 'lime', color: 'white'}}/>
              <MenuItem value={'bg-cyan'} primaryText="cyan" style={ {backgroundColor: 'cyan', color: 'white'}}/>
              <MenuItem value={'bg-cornflowerblue'} primaryText="cornflowerblue" style={ {backgroundColor: 'cornflowerblue', color: 'white'}}/>
              <MenuItem value={'bg-blue'} primaryText="blue" style={ {backgroundColor: 'blue', color: 'white'}}/>
              <MenuItem value={'bg-purple'} primaryText="purple" style={ {backgroundColor: 'purple', color: 'white'}}/>
              <MenuItem value={'bg-magenta'} primaryText="magenta" style={ {backgroundColor: 'magenta', color: 'white'}}/>
              <MenuItem value={'bg-black'} primaryText="black" style={ {backgroundColor: 'black', color: 'white'}} />
            </DropDownMenu>
          </div>
          
          

        </div>

        <div className="table-container" style={{MsTransform: `scale(${this.state.zoom},${this.state.zoom})`, WebkitTransform: `scale(${this.state.zoom},${this.state.zoom})`, transform: `scale(${this.state.zoom},${this.state.zoom})`, transformOrigin: '0% 0%'}}>
          <HotTable 
            className='table'
            data={this.state.table} 
            cells={(row,col,prop)=>{
              const cellProperties = {};
              cellProperties.className = this.getStyles(row,col);
              return cellProperties;
            }}
            contextMenu={true} 
            colHeaders={true} 
            rowHeaders={true}
            undo={true}
            manualColumnResize={true}
            manualRowResize={true}
            onAfterChange={ (changes) => {this.handleChange(changes)}}
            onAfterSelectionEnd={ (rStart, cStart, rEnd, cEnd) =>{this.handleSelect(rStart, cStart, rEnd, cEnd)}}
            // onAfterDeselect={()=>{this.handleSelect(null,null,null,null)}} 
            
          ></HotTable>
        </div>
      </div>
      </MuiThemeProvider>
    );
  }
}

export default Sheets;
