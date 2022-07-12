//
// Author: Christian Fufezan
//
'use strict';

var filterCount = dc.dataCount('.dc-data-count');
var tags = new dc.PieChart('#tag-group');
var styles = new dc.PieChart('#style-group');
var dataTable = new dc.DataTable('#dc-table-graph');
var txtSearch = new dc.TextFilterWidget("#search");

var ndx;
var all_detail;
var first = true;
var tableOffset = 0;
var tablePageSize = 5;

function uparma() {
  d3.json('parameters.json').then(function (data) {
    // Since its a csv file we need to format the data a bit.
    // data.forEach(function (d, i) {
    //   if (!d.hasOwnProperty("tags")) {
    //     d.tag = ["fas"];
    //   }
    // });
    // console.log(data[123]);

    console.log('<');

    //### Create Crossfilter Dimensions and Groups
    ndx = crossfilter(data);
    all_detail = ndx.groupAll();

    // default filter count
    filterCount /* dc.dataCount('.dc-data-count', 'chartGroup'); */
      .crossfilter(ndx)
      .groupAll(all_detail)
      // (_optional_) `.html` sets different html when some records or all records are selected.
      // `.html` replaces everything in the anchor with the html given using the following function.
      // `%filter-count` and `%total-count` are replaced with the values obtained.
      .html({
        some: '<strong>%filter-count</strong> selected out of <strong>%total-count</strong> records' +
          ' <br /><a href=\'javascript:dc.filterAll(); dc.renderAll();\'>Reset All</a>',
        all: 'All records selected.'
      });


    // Tags Pie Chart
    var tagDimension = ndx.dimension(function (d) { return d.tag; }, true);
    // var tagDimension = ndx.dimension(function (d) { return d.default_value; });
    var tagGroup = tagDimension.group().reduceCount();
    tags
      .width(320)
      .height(280)
      .slicesCap(10)
      .innerRadius(10)
      .dimension(tagDimension)
      .group(tagGroup)
      .legend(dc.legend().highlightSelected(true))
      // workaround for #703: not enough data is accessible through.label() to display percentages
      .on('pretransition', function (tags) {
        tags.selectAll('text.pie-slice').text(function (d) {
          return d.data.key; //+ ' ' + dc.utils.printSingleValue((d.endAngle - d.startAngle) / (2 * Math.PI) * 100) + '%';
        })
      })
      ;

    // Style  Chart
    var styleDimension = ndx.dimension(
      function (d) {
        var keys = [];
        for (var key in d.key_translations) {
          if (d.key_translations.hasOwnProperty(key)) {
            keys.push(key)
          }
        }
        return keys;
      },
      true
    );
    // var tagDimension = ndx.dimension(function (d) { return d.default_value; });
    var styleGroup = styleDimension.group().reduceCount();
    styles
      .width(320)
      .height(280)
      .slicesCap(10)
      .innerRadius(10)
      .dimension(styleDimension)
      .group(styleGroup)
      .legend(dc.legend().highlightSelected(true))
      // workaround for #703: not enough data is accessible through.label() to display percentages
      .on('pretransition', function (styles) {
        styles.selectAll('text.pie-slice').text(function (d) {
          return d.data.key; //+ ' ' + dc.utils.printSingleValue((d.endAngle - d.startAngle) / (2 * Math.PI) * 100) + '%';
        })
      })
      ;





















    // DataTable
    // Sortable dc table https://github.com/HamsterHuey/intothevoid.io/blob/master/code/2017/dcjs%20sortable%20table/dcjsSortableTable.html
    const nameDimension = ndx.dimension(function (d) { return d.name });

    var tableHeader = d3.select(".table-header")
      .selectAll("th");

    // Bind data to tableHeader selection.
    tableHeader = tableHeader.data(
      [
        { label: "name", field_name: "name", sort_state: "ascending" },
        { label: "default_value", field_name: "default_value", sort_state: "ascending" },
        { label: "description", field_name: "description", sort_state: "ascending" },
        { label: "tag", field_name: "tag", sort_state: "ascending" }
      ]
    );


    // ##############################
    // Generate the dc.js dataTable
    // ##############################
    // Create generating functions for each columns
    var columnFunctions = [
      // function (d) { return '<a href="arcpp_protein.html?hvo=' + d['HVO ID'].toLowerCase() + '" target="_blank">' + d['HVO ID'] + '</a>'; },
      // function (d) { return d['Uniprot ID']; },
      // function (d) { return d.PSMs; },
      // function (d) { return d.Peptides; },
      // function (d) { return seqCovFormat(d['Sequence Coverage']); },
      function (d) { return d.name; },
      function (d) { return d.default_value; },
      function (d) { return d.description; },
      function (d) { return d.tag; }
    ];
    tableHeader = tableHeader.enter()
      .append("th")
      .text(function (d) { return d.label; }) // Accessor function for header titles
      .on("click", tableHeaderCallback);

    function tableHeaderCallback(d) {
      // Highlight column header being sorted and show bootstrap glyphicon
      var activeClass = "info";

      d3.selectAll("#dc-table-graph th") // Disable all highlighting and icons
        .classed(activeClass, false)
        .selectAll("span")
        .style("visibility", "hidden") // Hide glyphicon

      var activeSpan = d3.select(this) // Enable active highlight and icon for active column for sorting
        .classed(activeClass, true)  // Set bootstrap "info" class on active header for highlight
        .select("span")
        .style("visibility", "visible");

      // Toggle sort order state to user desired state
      d.sort_state = d.sort_state === "ascending" ? "descending" : "ascending";

      var isAscendingOrder = d.sort_state === "ascending";
      dataTable
        .order(isAscendingOrder ? d3.ascending : d3.descending)
        .sortBy(function (datum) { return datum[d.field_name]; });

      // Reset glyph icon for all other headers and update this headers icon
      activeSpan.node().className = ''; // Remove all glyphicon classes

      // Toggle glyphicon based on ascending/descending sort_state
      activeSpan.classed(
        isAscendingOrder ? "glyphicon glyphicon-sort-by-attributes" :
          "glyphicon glyphicon-sort-by-attributes-alt", true);

      updateTable();
      dataTable.redraw();
    }
    // Initialize sort state and sort icon on one of the header columns
    // Highlight "Max Conf" cell on page load
    // This can be done programmatically for user specified column
    tableHeader.filter(function (d) { return d.label === "name"; })
      .classed("info", true);

    var tableSpans = tableHeader
      .append("span") // For Sort glyphicon on active table headers
      .classed("glyphicon glyphicon-sort-by-attributes-alt", true)
      .style("visibility", "hidden")
      .filter(function (d) { return d.label === "name"; })
      .style("visibility", "visible");



    // Pagination implementation inspired by:
    // https://github.com/dc-js/dc.js/blob/master/web/examples/table-pagination.html
    dataTable.width(960).height(800)
      .dimension(nameDimension)
      .section(function (d) { return "Dummy" }) // Must pass in. Ignored since .showGroups(false)
      .size(Infinity)
      .columns(columnFunctions)
      .showSections(false)
      .sortBy(function (d) { return d.name; }) // Initially sort by max_conf column
      .order(d3.ascending);

    updateTable();
    dataTable.redraw();

    // Text search
    var txt_search_dim = ndx.dimension(function (d) { return d.description; });
    txtSearch.dimension(txt_search_dim)
      .on('filtered', function (chart) {
        txt_search_dim.filterAll();
      });

    dc.renderAll();
    console.log("loaded...")

  });
  console.log("> Done....");
};

// updateTable calculates correct start and end indices for current page view
// it slices and pulls appropriate date for current page from dataTable object
// Finally, it updates the pagination button states depending on if more records
// are available
function updateTable() {
  // Ensure Prev/Next bounds are correct, especially after filters applied to dc charts
  var totFilteredRecs = ndx.groupAll().value();
  // Adjust values of start and end record numbers for edge cases
  var end = tableOffset + tablePageSize > totFilteredRecs ? totFilteredRecs : tableOffset + tablePageSize;
  tableOffset = tableOffset >= totFilteredRecs ? Math.floor((totFilteredRecs - 1) / tablePageSize) * tablePageSize : tableOffset;
  tableOffset = tableOffset < 0 ? 0 : tableOffset; // In case of zero entries

  // Grab data for current page from the dataTable object
  dataTable.beginSlice(tableOffset);
  dataTable.endSlice(tableOffset + tablePageSize);

  // Update Table paging buttons and footer text
  d3.select('span#begin')
    .text(end === 0 ? tableOffset : tableOffset + 1); // Correct for "Showing 1 of 0" bug
  d3.select('span#end')
    .text(end);
  d3.select('#Prev.btn')
    .attr('disabled', tableOffset - tablePageSize < 0 ? 'true' : null);
  d3.select('#Next.btn')
    .attr('disabled', tableOffset + tablePageSize >= totFilteredRecs ? 'true' : null);
  d3.select('span#size').text(totFilteredRecs);
  dataTable.redraw();
}
// Callback function for clicking "Next" page button
function nextPage() {
  tableOffset += tablePageSize;
  updateTable();
}
// Callback function for clicking "Prev" page button
function prevPage() {
  tableOffset -= tablePageSize;
  updateTable();
}

