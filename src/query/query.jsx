import { AthenaClient, GetNamedQueryCommand, StartQueryExecutionCommand, GetQueryResultsCommand } from "@aws-sdk/client-athena"; // ES Modules import

const region = process.env.REACT_APP_REGION
const access_key = process.env.REACT_APP_ACCESS_KEY
const secret_key = process.env.REACT_APP_SECRET

function groupByWithSum(arr, key, avgField) {
    return arr.reduce((acc, obj) => {
      // Obtenemos el valor del campo por el cual agrupamos
      const groupValue = obj[key];
      
      // Creamos una copia del objeto sin la propiedad del campo de agrupación
      const { [key]: _, ...rest } = obj;
      
      // Si el grupo no existe en el acumulador, lo creamos
      if (!acc[groupValue]) {
        acc[groupValue] = {
          items: [],
          total: 0,
          count: 0,
          average: 0
        };
      }
  
      // Añadimos el objeto modificado (sin la propiedad de agrupación) al grupo correspondiente
      acc[groupValue].items.push(rest);
  
      // Actualizamos el total y el contador para calcular el promedio
      acc[groupValue].total += obj[avgField];
      acc[groupValue].count += 1;
      acc[groupValue].average = acc[groupValue].total / acc[groupValue].count;
  
      return acc;
    }, {});
  }
  
function groupBy(arr, key) {
    return arr.reduce((acc, obj) => {
        const groupValue = obj[key];

        const { [key]: _, ...rest } = obj;

        if (!acc[groupValue]) {
            acc[groupValue] = [];
        }

        acc[groupValue].push(rest);

        return acc;
    }, {});
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function AthenaQuery(named_query_id, database, output_location) {

  const config = {region: region, credentials: {accessKeyId: access_key, secretAccessKey: secret_key}};
  const client = new AthenaClient(config);
  const input = { // GetNamedQueryInput
    NamedQueryId: named_query_id, // required
  };
  const command = new GetNamedQueryCommand(input);
  const response = await client.send(command);
  console.log('response: ', response.NamedQuery?.QueryString);
  const query_string = response.NamedQuery?.QueryString;

  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = String(today.getFullYear()).padStart(4, '0');
  const input_query = {
    QueryString: query_string,
    QueryExecutionContext: {
      Database: database,  
    },
    ResultConfiguration: {
      OutputLocation: output_location+year+"/"+month+"/"+day+"/"
    },
  }
  const query_execution = new StartQueryExecutionCommand(input_query);
  const result_execution = await client.send(query_execution);
  const query_execution_id = result_execution.QueryExecutionId;
  console.log('response_execution: ', query_execution_id);

  await delay(5000);

  const get_information = new GetQueryResultsCommand({
    QueryExecutionId: query_execution_id
  });
  const result = await client.send(get_information);
  console.log('final_result: ', result);
  const rows = result.ResultSet?.ResultRows;

  let X = [];
  let Y = [];

  let data_to_response = {
    seriesData: X,
    drilldownData: Y
  }

  if (rows) {

    const dataRows = rows.slice(1);

    const records_object = dataRows.map((item) => ({
        category: item.Data[0],
        platform: item.Data[1],
        event_name: item.Data[2],
        y: parseFloat(item.Data[3])
    }));

    const data_by_platform = groupBy(records_object,'platform');

    const Android = groupByWithSum(data_by_platform.Android, 'category', 'y');
    const Android_data = Object.entries(Android).map(([date,value]) => ({
        name: date,
        y: value.average,
        drilldown: date
    }));
    const Android_drillData = Object.entries(Android).map(([date,value])=>{
        const events = value.items.map((obj) => ({name:obj.event_name, y:obj.y}));
        return({
            id:date,
            data:events
        })
    })

    Y.push(Android_drillData)
    

    X.push({name:'Android', data:Android_data})

    console.log('Android data:',Android_data)

    const iOS = groupByWithSum(data_by_platform.iOS, 'category', 'y');
    const iOS_data = Object.entries(iOS).map(([date,value]) => ({
        name: date,
        y: value.average,
        drilldown: date
    }))

    X.push({name:'iOS', data:iOS_data})

    const web = groupByWithSum(data_by_platform.web, 'category', 'y');
    const web_data = Object.entries(web).map(([date,value]) => ({
        name: date,
        y: value.average,
        drilldown: date
    }))

    X.push({name:'web', data:web_data})



    let chartData = {
        Android: Android,
        iOS: iOS,
        web: web
    }

    console.log('seriesData: ',chartData)

    // X.push(chartData)

    }
  

  console.log("data_to_response ", data_to_response);
  return (data_to_response);
  }