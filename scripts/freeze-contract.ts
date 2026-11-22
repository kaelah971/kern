import { readFileSync, writeFileSync } from 'node:fs';
import { canonicalContractPayload, contractSha256, type PromiseContract } from '../src/lib/contract.ts';

const contractPath = new URL('../contracts/demo-promise.json', import.meta.url);
const contract = JSON.parse(readFileSync(contractPath, 'utf8')) as PromiseContract;

const hash = contractSha256(contract);
contract.specSha256 = hash;
writeFileSync(contractPath, `${JSON.stringify(contract, null, 2)}\n`, 'utf8');

console.log(`Frozen contract ${contract.id} v${contract.version}`);
console.log(`canonical payload: ${canonicalContractPayload(contract).length} bytes`);
console.log(`specSha256: ${hash}`);
