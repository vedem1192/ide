import { ActionTree, MutationTree, GetterTree } from 'vuex'
import { CompileState, RootState, CompiledCode } from '../../types'
import Web3, { compile } from '../../../../@titan-suite/core/aion'
import { nodeAddress } from '../../titanrc'
import { ContractAbi as TypeContractAbi } from 'ethereum-types'
import { parse } from 'typechain/dist/parser/abiParser'

const compileState: CompileState = {
  compiledCode: {},
  solVersions: [
    {
      value: '0.4.9',
      label: '0.4.9'
    },
    {
      value: '0.4.15',
      label: '0.4.15'
    }
  ],
  contracts: {},
  nodeAddress,
  isConnectedToNode: false
}

export type ContractNames = string[]
export type ContractByteCode = (contractName: string) => string
export type ContractAbi = (contractName: string) => TypeContractAbi
export type ContractDetails = (contractName: string) => CompiledCode

const compileGetters: GetterTree<CompileState, RootState> = {
  contractNames(state): ContractNames {
    return Object.keys(state.compiledCode)
  },
  contractByteCode(state): ContractByteCode {
    return contractName => state.compiledCode[contractName].code
  },
  contractAbi(state): ContractAbi {
    return contractName => state.compiledCode[contractName].info.abiDefinition
  },
  contractDetails(state): ContractDetails {
    return contractName => state.compiledCode[contractName]
  }
}

const compileMutations: MutationTree<CompileState> = {
  saveCompiledCode(state, payload) {
    state.compiledCode = payload
  },
  saveContract(state, { name, data }) {
    state.contracts = { ...state.contracts, [name]: data }
  },
  saveNodeAddress(state, payload) {
    state.nodeAddress = payload
  },
  setNodeStatus(state, status: boolean) {
    state.isConnectedToNode = status
  }
}

const compileActions: ActionTree<CompileState, RootState> = {
  async compile(
    { state, rootState, commit, dispatch, getters, rootGetters },
    solVersion
  ) {
    const code =
      rootState.workspace.workspaces[rootState.workspace.activeWorkspaceIndex]
        .projectTree.folders[0].files[0].code
    try {
      const web3 = new Web3(new Web3.providers.HttpProvider(state.nodeAddress))
      console.log({ web3 }, solVersion)
      const contracts = await compile({
        contract: `pragma solidity ^0.4.9;
                    contract Example {
                        uint128 public num = 5;
                        event NumChanged (uint128);
                        function add(uint128 a) public returns (uint128) {
                            return num+a;
                        }
                        function setA(uint128 a) public {
                            num = a;
                            NumChanged(num);
                        }}
                      contract WithConstructor {
                      uint128 public num = 5;
                      event NumChanged (uint128);
                      function add(uint128 a) public returns (uint128) {
                          return num+a;
                      }
                      function WithConstructor(uint128 a) public {
                        num = a;
                      }
                      function setA(uint128 a) public {
                          num = a;
                          NumChanged(num);
                      }}`,
        web3
      })
      console.log({ data: contracts })
      commit('saveCompiledCode', contracts)
      for (const [
        contractName,
        {
          info: { abiDefinition }
        }
      ] of Object.entries(contracts)) {
        console.log(contractName, abiDefinition)
        commit('saveContract', {
          name: contractName,
          data: parse(abiDefinition, contractName)
        })
      }
      commit('setNodeStatus', true)
    } catch (error) {
      console.log(error)
      throw error
    }
  }
}

export default {
  namespaced: true,
  state: compileState,
  getters: compileGetters,
  mutations: compileMutations,
  actions: compileActions
}
