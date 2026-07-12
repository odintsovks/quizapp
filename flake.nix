{
  description = "quizapp";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";

  outputs = { self, nixpkgs }:
  let
    system = "x86_64-linux";
    pkgs = nixpkgs.legacyPackages.${system};
  in
  {
    devShell.${system} = pkgs.mkShellNoCC {
      shellHook = ''
        export DEV_SHELL_LSPS='vue_ls = {cmd = {"${pkgs.vue-language-server}/bin/vue-language-server", "--stdio"}}, vtsls = {cmd = {"${pkgs.vtsls}/bin/vtsls", "--stdio"}, settings={vtsls={tsserver={globalPlugins={{name="@vue/typescript-plugin",location="${pkgs.vue-language-server}/lib/language-tools/packages/language-server",languages={"vue"},configNamespace="typescript"}}}}}, filetypes={"typescript", "javascript", "javascriptreact", "typescriptreact", "vue"}}'
      '';
      packages = with pkgs; [
        nodejs_24
      ];
    };
  };
}
