import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import * as k8s from '@kubernetes/client-node';
import type { NextApiRequest, NextApiResponse } from 'next';

export type SystemEnvResponse = {
  domain: string;
  desktopDomain: string;
  env_storage_className: string;
  migrate_file_image: string;
  minio_url: string;
  BACKUP_ENABLED: boolean;
  SHOW_DOCUMENT: boolean;
  CurrencySymbol: 'shellCoin' | 'cny' | 'usd';
  STORAGE_MAX_SIZE: number;
  kubeconfig: string;
};

process.on('unhandledRejection', (reason, promise) => {
  console.error(`Caught unhandledRejection:`, reason, promise);
});

process.on('uncaughtException', (err) => {
  console.error(`Caught uncaughtException:`, err);
});

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  //根据运行环境选择 k8sConfig
  const kc = new k8s.KubeConfig();
  if (process.env.NODE_ENV === 'production') {
    kc.loadFromCluster();
  } else if (process.env.NODE_ENV === 'development') {
    kc.loadFromDefault();
  }

  jsonRes<SystemEnvResponse>(res, {
    data: {
      domain: process.env.SEALOS_DOMAIN || 'cloud.sealos.io',
      desktopDomain: process.env.DESKTOP_DOMAIN || 'cloud.sealos.io',
      env_storage_className: process.env.STORAGE_CLASSNAME || 'openebs-backup',
      migrate_file_image: process.env.MIGRATE_FILE_IMAGE || 'ghcr.io/wallyxjh/test:7.1',
      minio_url: process.env.MINIO_URL || '',
      BACKUP_ENABLED: process.env.BACKUP_ENABLED === 'true',
      SHOW_DOCUMENT: process.env.SHOW_DOCUMENT === 'true',
      CurrencySymbol: (process.env.CURRENCY_SYMBOL || 'shellCoin') as 'shellCoin' | 'cny' | 'usd',
      STORAGE_MAX_SIZE: Number(process.env.STORAGE_MAX_SIZE) || 300,
      kubeconfig: kc.exportConfig()
    }
  });
}
