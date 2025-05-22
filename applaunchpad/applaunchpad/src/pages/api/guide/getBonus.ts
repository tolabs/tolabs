import { authAppToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
   try {

    const amount =  Number(9999)
    const rechargeOptions = {
        amount: Number(amount),
        gift: Math.floor((Number(amount) * Number(1)) / 100)
    }
    jsonRes(res, {
      code: 200,
      data: rechargeOptions
    });
  } catch (err: any) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
