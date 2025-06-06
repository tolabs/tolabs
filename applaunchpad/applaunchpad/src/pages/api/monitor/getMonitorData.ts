import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { monitorFetch } from '@/services/monitorFetch';
import { MonitorServiceResult, MonitorDataResult, MonitorQueryKey } from '@/types/monitor';
import type { NextApiRequest, NextApiResponse } from 'next';
import * as k8s from "@kubernetes/client-node";

const AdapterChartData: Record<
  keyof MonitorQueryKey,
  (data: MonitorServiceResult) => MonitorDataResult[]
> = {
  disk: (data: MonitorServiceResult) => {
    const newDataArray = data.data.result.map((item) => {
      let name = item.metric.pod;
      let xData = item.values.map((value) => value[0]);
      let yData = item.values.map((value) => parseFloat(value[1]).toFixed(2));
      return {
        name: name,
        xData: xData,
        yData: yData
      };
    });
    return newDataArray;
  },
  cpu: (data: MonitorServiceResult) => {
    const newDataArray = data.data.result.map((item) => {
      let name = item.metric.pod;
      let xData = item.values.map((value) => value[0]);
      let yData = item.values.map((value) => parseFloat(value[1]).toFixed(2));
      return {
        name: name,
        xData: xData,
        yData: yData
      };
    });
    return newDataArray;
  },
  memory: (data: MonitorServiceResult) => {
    const newDataArray = data.data.result.map((item) => {
      let name = item.metric.pod;
      let xData = item.values.map((value) => value[0]);
      let yData = item.values.map((value) => parseFloat(value[1]).toFixed(2));
      return {
        name: name,
        xData: xData,
        yData: yData
      };
    });
    return newDataArray;
  },
  average_cpu: (data: MonitorServiceResult) => {
    const newDataArray = data.data.result.map((item) => {
      let name = item.metric.pod;
      let xData = item.values.map((value) => value[0]);
      let yData = item.values.map((value) => parseFloat(value[1]).toFixed(2));
      return {
        name: name,
        xData: xData,
        yData: yData
      };
    });
    return newDataArray;
  },
  average_memory: (data: MonitorServiceResult) => {
    const newDataArray = data.data.result.map((item) => {
      let name = item.metric.pod;
      let xData = item.values.map((value) => value[0]);
      let yData = item.values.map((value) => parseFloat(value[1]).toFixed(2));
      return {
        name: name,
        xData: xData,
        yData: yData
      };
    });
    return newDataArray;
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    //const kubeconfig = await authSession(req.headers);

    //根据运行环境选择 k8sConfig
    const kc2 = new k8s.KubeConfig();
    if (process.env.NODE_ENV === 'production') {
      kc2.loadFromCluster();
    } else if (process.env.NODE_ENV === 'development') {
      kc2.loadFromDefault();
    }
    const kubeconfig = kc2.exportConfig();

    const { namespace, kc } = await getK8s({
      kubeconfig: kubeconfig
    });

    const { queryName, queryKey, start, end, step = '1m' } = req.query;

    // One hour of monitoring data
    const endTime = end ? Number(end) : Date.now();
    const startTime = start ? Number(start) : endTime - 60 * 60 * 1000;

    const params = {
      type: queryKey,
      launchPadName: queryName,
      namespace: namespace,
      start: Math.floor(startTime / 1000),
      end: Math.floor(endTime / 1000),
      step: step
    };

    const result: MonitorDataResult = await monitorFetch(
      {
        url: '/query',
        params: params
      },
      kubeconfig
    ).then((res) => {
      // @ts-ignore
      return AdapterChartData[queryKey]
        ? // @ts-ignore
          AdapterChartData[queryKey](res as MonitorDataResult)
        : res;
    });

    jsonRes(res, {
      code: 200,
      data: result
    });
  } catch (error) {
    jsonRes(res, {
      code: 500,
      error: error
    });
  }
}
