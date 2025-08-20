import axios from 'axios'

let baseURL = 'http://localhost:3000'

const service = axios.create({
  baseURL // api 的 base_url
})

export default service
