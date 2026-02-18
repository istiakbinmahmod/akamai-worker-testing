import { applyExperiments } from '@optimizely/edge-delivery';
import { Request, installGlobalPolyfills, KVNamespace } from '@optimizely/akamai-edgeworker-polyfill';
import { EdgeKV } from './edgekv.js';
import { createResponse } from 'create-response';                                                                                                                

installGlobalPolyfills();                                                                                                                                                                              
                                                                                                                                                                                    
export async function responseProvider(request: EW.ResponseProviderRequest): Promise<any> {                                                                                           
    try {                                                                                                                                                                                                                                                                                                 
        const translatedRequest = new Request(request); 

        const edgeKv = new EdgeKV({ namespace: 'default', group: 'default' });
        const optimizelyKV = new KVNamespace(edgeKv);

        // Response polyfill automatically converts to Akamai format when awaited
        // @ts-ignore
        return await applyExperiments(translatedRequest, {
            waitUntil: (promise: Promise<any>) => {
                promise.then().catch((e) => console.error('waitUntil error:', e));
            },
            passThroughOnException: () => {
                console.log('passThroughOnException called');
            },
        }, {
            accountId: 5949802916085760,
            devUrl: 'https://example.com',
            kvNamespace: optimizelyKV,
            webhookSecret: 'GY6Sfxqz-vt_JHE3m7_xYaBPe59pVHLORnpi9Lfehac',
            environment: 'prod',
        });                               
                                                                                                                                                                                    
    } catch (error) {                                                                                                                                                                 
        console.error('Error in responseProvider:', error);                                                                                                                                                                                                                                                                                                                                                                    
                                                                                                                                                                                    
        return createResponse('Internal server error: ' + (error?.toString() || 'Unknown error'), {                                                                 
            status: 500,                                                                                                                                                              
            headers: {                                                                                                                                                                
                'Content-Type': ['text/plain'],                                                                                                                                        
            },                                                                                                                                                                         
        });                                                                                                                                                                           
    }                                                                                                                                                                                 
}                                                                                                                                                                                     