import { useState, useEffect } from 'react';
import HighchartsReact from 'highcharts-react-official';
import Highcharts from 'highcharts';
import HighchartsDrilldown from 'highcharts/modules/drilldown';
import { AthenaQuery } from '../query/query';

HighchartsDrilldown(Highcharts);

const InteractionsXVisitor = () => {
  const [queryData, setQueryData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [range, setRange] = useState([]);


  useEffect(() => {
    const fetchData = async () => {
      const result = await AthenaQuery('65a9a531-ab23-4080-a3d5-ab61e44624eb','vit','s3://vit-insights/demo-se-glue-athena/processed/test_InterxVisitor/');
      setQueryData(result)
    };
    fetchData();
  }, []);
  const filteredData = queryData?.seriesData.slice(0,range);

  useEffect(() => {
    const chartConfig = {
        chart: {
          type: 'column'
        },
        title: {
          text: 'Event Counts by Platform'
        },
        xAxis: {
          type: 'category'
        },
        series: queryData?.seriesData,
        drilldown: {
          series: queryData?.drilldownData[0]
        },
        rangeSelector: {
          floating: true,
          verticalAlign: 'top',
          x:0,
          y:0
        }
      };
  
    setChartData(chartConfig);
  }, []);



  return (
    <div>
      <label>Range (date): {range}</label>
      <input type='range' min='1' max={queryData?.seriesData.lenght} value={range} onChange={(e) => setRange(e.target.value, 10)} />
      { chartData ? (<HighchartsReact highcharts={Highcharts} options={chartData}/>) : (<p>Loading</p>)}
    </div>
  );
};

export default InteractionsXVisitor;
