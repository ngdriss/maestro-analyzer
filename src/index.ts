import { createProgram } from 'typescript'
import {
  NOOP_PERF_RECORDER,
  PerfRecorder,
} from '@angular/compiler-cli/src/ngtsc/perf'
import {
  CompilationMode,
  DtsTransformRegistry,
  TraitCompiler,
} from '@angular/compiler-cli/src/ngtsc/transform'
import { TypeScriptReflectionHost } from '@angular/compiler-cli/src/ngtsc/reflection'
import { IncrementalCompilation } from '@angular/compiler-cli/src/ngtsc/incremental'
import {
  ComponentDecoratorHandler,
  NoopReferencesRegistry,
} from '@angular/compiler-cli/src/ngtsc/annotations'
import {
  CycleAnalyzer,
  CycleHandlingStrategy,
  ImportGraph,
} from '@angular/compiler-cli/src/ngtsc/cycles'
import { PartialEvaluator } from '@angular/compiler-cli/src/ngtsc/partial_evaluator'
import {
  DeferredSymbolTracker,
  ModuleResolver,
  ReferenceEmitter,
} from '@angular/compiler-cli/src/ngtsc/imports'
import {
  CompoundMetadataReader,
  DtsMetadataReader,
  HostDirectivesResolver,
  LocalMetadataRegistry,
  ResourceRegistry,
} from '@angular/compiler-cli/src/ngtsc/metadata'
import {
  LocalModuleScopeRegistry,
  MetadataDtsModuleScopeResolver,
  TypeCheckScopeRegistry,
} from '@angular/compiler-cli/src/ngtsc/scope'
import { InjectableClassRegistry } from '@angular/compiler-cli/src/ngtsc/annotations/common'
import { AdapterResourceLoader } from '@angular/compiler-cli/src/ngtsc/resource'
import { NgCompilerHost } from '@angular/compiler-cli/src/ngtsc/core'
import { readConfiguration } from '@angular/compiler-cli'
import { NgCompilerOptions } from '@angular/compiler-cli/src/ngtsc/core/api'
import {
  NgtscCompilerHost,
  FileSystem,
  NodeJSFileSystem,
} from '@angular/compiler-cli/src/ngtsc/file_system'

export class MaestroAnalyzer {
  private analyzed = false
  private readonly options: NgCompilerOptions
  private readonly rootNames: ReadonlyArray<string>

  constructor(
    tsConfigPath: string,
    private fs: FileSystem = new NodeJSFileSystem(),
    private perfRecorder: PerfRecorder = NOOP_PERF_RECORDER
  ) {
    const config = readConfiguration(tsConfigPath)
    this.options = config.options
    this.rootNames = config.rootNames
  }

  getAllComponents(): any[] {
    this.ensureAnalyze()
    return []
  }

  private ensureAnalyze() {
    if (!this.analyzed) {
      this.analyze()
      this.analyzed = true
    }
  }

  private analyze() {
    for (const sourceFile of this.program.getSourceFiles()) {
      if (sourceFile.isDeclarationFile) {
        continue
      }
      this.traitCompiler.analyzeSync(sourceFile)
    }
  }

  private get traitCompiler() {
    return new TraitCompiler(
      [this.componentHandler],
      this.reflector,
      this.perfRecorder,
      this.incrementalBuild,
      this.options.compileNonExportedClasses != false,
      CompilationMode.FULL,
      this.dtsTransforms,
      null,
      this.host
    )
  }

  private get componentHandler() {
    return new ComponentDecoratorHandler(
      this.reflector,
      this.evaluator,
      this.metaRegistry,
      this.metaReader,
      this.scopeRegistry,
      this.dtsResolver,
      this.scopeRegistry,
      this.typeCheckScopeRegistry,
      this.resourceRegistry,
      false,
      false,
      this.resourceLoader,
      this.host.rootDirs,
      /* defaultPreserveWhitespaces */ false,
      /* i18nUseExternalIds */ true,
      /* enableI18nLegacyMessageIdFormat */ false,
      /* usePoisonedData */ false,
      /* i18nNormalizeLineEndingsInICUs */ false,
      new Set(),
      this.moduleResolver,
      this.cycleAnalyzer,
      CycleHandlingStrategy.UseRemoteScoping,
      this.refEmitter,
      this.referencesRegistry,
      /* depTracker */ null,
      this.injectableRegistry,
      /* semanticDepGraphUpdater */ null,
      /* annotateForClosureCompiler */ false,
      this.perfRecorder,
      this.hostDirectivesResolver,
      true,
      CompilationMode.FULL,
      this.deferredSymbolTracker
    )
  }

  private get deferredSymbolTracker() {
    return new DeferredSymbolTracker(this.typeChecker)
  }

  private get resourceLoader() {
    return new AdapterResourceLoader(this.host, this.options)
  }

  private get typeCheckScopeRegistry() {
    return new TypeCheckScopeRegistry(
      this.scopeRegistry,
      this.metaReader,
      this.hostDirectivesResolver
    )
  }

  private get hostDirectivesResolver() {
    return new HostDirectivesResolver(this.metaReader)
  }

  private get resourceRegistry() {
    return new ResourceRegistry()
  }

  private get injectableRegistry() {
    return new InjectableClassRegistry(this.reflector, /* isCore */ false)
  }

  private get referencesRegistry() {
    return new NoopReferencesRegistry()
  }

  private get refEmitter() {
    return new ReferenceEmitter([])
  }

  private get scopeRegistry() {
    return new LocalModuleScopeRegistry(
      this.metaRegistry,
      this.metaReader,
      this.dtsResolver,
      this.refEmitter,
      null
    )
  }

  private get metaReader() {
    return new CompoundMetadataReader([this.metaRegistry, this.dtsReader])
  }

  private get dtsResolver() {
    return new MetadataDtsModuleScopeResolver(this.dtsReader, null)
  }

  private get dtsReader() {
    return new DtsMetadataReader(this.typeChecker, this.reflector)
  }

  private get metaRegistry() {
    return new LocalMetadataRegistry()
  }

  private get importGraph() {
    return new ImportGraph(this.typeChecker, NOOP_PERF_RECORDER)
  }

  private get cycleAnalyzer() {
    return new CycleAnalyzer(this.importGraph)
  }

  private get moduleResolver() {
    return new ModuleResolver(
      this.program,
      this.options,
      this.host,
      /* moduleResolutionCache */ null
    )
  }

  private get evaluator() {
    return new PartialEvaluator(
      this.reflector,
      this.typeChecker,
      /* dependencyTracker */ null
    )
  }

  private get typeChecker() {
    return this.program.getTypeChecker()
  }

  private get reflector() {
    return new TypeScriptReflectionHost(this.typeChecker)
  }

  private get incrementalBuild() {
    return IncrementalCompilation.fresh(this.program, null)
  }

  private get dtsTransforms() {
    return new DtsTransformRegistry()
  }

  private get host() {
    const baseHost = new NgtscCompilerHost(this.fs, this.options)
    return NgCompilerHost.wrap(baseHost, this.rootNames, this.options, null)
  }

  private get program() {
    return createProgram({
      host: this.host,
      rootNames: this.host.inputFiles,
      options: this.options,
    })
  }
}
