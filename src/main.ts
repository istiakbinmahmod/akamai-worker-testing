import * as DATA from './data.json';
import { applyExperiments } from '@optimizely/edge-delivery';
import { RuntimeRequest, installGlobalPolyfills, KVNamespace } from '@optimizely/akamai-edgeworker-polyfill';
import { EdgeKV } from './edgekv.js';
import { createResponse } from 'create-response';                                                                                                                

installGlobalPolyfills();                                                                                                                                                                              
                                                                                                                                                                                    
export async function responseProvider(request: EW.ResponseProviderRequest): Promise<any> {                                                                                           
    try {                                                                                                                                                                                                                                                                                                 
        const translatedRequest = new RuntimeRequest(request); 

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
            snippetId: 2147483647,
            environment: 'prod',
            DATA,
            webhookSecret: 'ka8n6xJBskaukCJfmKvhfy3d-rnJp-KL53beuSABvRI',
            accountId: 12345678,
            kvNamespace: optimizelyKV,
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