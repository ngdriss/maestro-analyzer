import { WorkspaceSymbols } from 'ngast'
import { join } from 'path'
import { MaestroAnalyzer } from '../src'

describe('Analyzer', () => {
  const config = join(__dirname, './fixtures/basic', 'tsconfig.json')

  // describe('NgAst', () => {
  //   it('should find the component', () => {
  //     const workspace = new WorkspaceSymbols(config)
  //     const component = workspace.getAllComponents()
  //     expect(component).toBeTruthy()
  //   })
  // })

  describe('MaestroAnalyzer', () => {
    it('should find the component', () => {
      const maestroAnalyzer = new MaestroAnalyzer(config)
      const component = maestroAnalyzer.getAllComponents()
      expect(component).toBeTruthy()
    })
  })
})
