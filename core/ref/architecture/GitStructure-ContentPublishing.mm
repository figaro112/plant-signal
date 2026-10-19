<map version="1.0.1">
  <node TEXT="root/">
    <richcontent TYPE="NOTE">
      <html><body><p>Koreň repozitára – zdrojový obsah, systémové šablóny, konfigurácia a staging publikácie.</p></body></html>
    </richcontent>

    <!-- CONTENT -->
    <node TEXT="content/">
      <richcontent TYPE="NOTE">
        <html><body><p>SSOT – jediný zdroj pravdy. Tu žijú .md s FrontMatter. Buildy sa týchto súborov nedotýkajú.</p></body></html>
      </richcontent>

      <node TEXT="docs/">
        <richcontent TYPE="NOTE">
          <html><body><p>Obsah určený na publikovanie (študenti, KNIFE, projekty). Jazykové vetvy: sk / en.</p></body></html>
        </richcontent>

        <node TEXT="sk/">
          <node TEXT="knifes/">
            <richcontent TYPE="NOTE"><html><body><p>KNIFE príspevky komunity.</p></body></html></richcontent>
          </node>
          <node TEXT="diploma-thesis/">
            <richcontent TYPE="NOTE"><html><body><p>Štruktúry diplomových prác (kapitoly).</p></body></html></richcontent>
          </node>
          <node TEXT="7ds/">
            <richcontent TYPE="NOTE"><html><body><p>Metodika 7Ds (D1…D7).</p></body></html></richcontent>
          </node>
          <node TEXT="sdlc/">
            <richcontent TYPE="NOTE"><html><body><p>Životný cyklus vývoja softvéru.</p></body></html></richcontent>
          </node>
          <node TEXT="q12/">
            <richcontent TYPE="NOTE"><html><body><p>Rámec tímovej reflexie a wellbeing (Q12).</p></body></html></richcontent>
          </node>
        </node>

        <node TEXT="en/">
          <richcontent TYPE="NOTE"><html><body><p>Anglický obsah – rovnaká štruktúra ako sk/.</p></body></html></richcontent>
        </node>
      </node>
    </node>

    <!-- CORE -->
    <node TEXT="core/">
      <richcontent TYPE="NOTE">
        <html><body><p>„Engine“ repozitára: systémové šablóny, skripty a interné referencie. Bez jazykových mutácií.</p></body></html>
      </richcontent>

      <node TEXT="templates/">
        <richcontent TYPE="NOTE">
          <html><body><p>Systémové šablóny, z ktorých generujeme obsah do content/.</p></body></html>
        </richcontent>

        <node TEXT="content/">
          <richcontent TYPE="NOTE">
            <html><body><p>Štartéry pre tvorbu obsahu (jazykové varianty vnútri).</p></body></html>
          </richcontent>

          <node TEXT="knife/">
            <node TEXT="sk/index.template.md"/>
            <node TEXT="en/index.template.md"/>
          </node>
          <node TEXT="diploma-thesis/">
            <node TEXT="sk/01-uvod/index.template.md"/>
            <node TEXT="sk/02-teoria/index.template.md"/>
            <node TEXT="sk/03-navrh/index.template.md"/>
            <node TEXT="sk/04-realizacia/index.template.md"/>
            <node TEXT="sk/05-zaver/index.template.md"/>
            <node TEXT="en/01-intro/index.template.md"/>
            <node TEXT="en/02-theory/index.template.md"/>
            <node TEXT="en/03-design/index.template.md"/>
            <node TEXT="en/04-implementation/index.template.md"/>
            <node TEXT="en/05-conclusion/index.template.md"/>
          </node>
          <node TEXT="7ds/sk/index.template.md"/>
          <node TEXT="sdlc/sk/index.template.md"/>
          <node TEXT="q12/sk/index.template.md"/>
        </node>

        <node TEXT="production/">
          <richcontent TYPE="NOTE"><html><body><p>„Release-ready“ predlohy – finálne rozloženie a sekcie pre publikovanie.</p></body></html></richcontent>
          <node TEXT="knife/index.production.md"/>
        </node>
      </node>

      <node TEXT="scripts/">
        <richcontent TYPE="NOTE">
          <html><body><p>Systémové skripty: generovanie z templates, staging publikácie, FM utilitky.</p></body></html>
        </richcontent>
        <node TEXT="tools/new-from-template.mjs"/>
        <node TEXT="publish/stage-sites.mjs"/>
        <node TEXT="fm/fm_apply.mjs"/>
        <node TEXT="fm/verify_fm.mjs"/>
      </node>

      <node TEXT="refs/">
        <richcontent TYPE="NOTE"><html><body><p>Interné poznámky k jadru (technické zápisky, architektúra).</p></body></html></richcontent>
      </node>
    </node>

    <!-- CONFIG -->
    <node TEXT="config/">
      <richcontent TYPE="NOTE"><html><body><p>Konfigurácia: schémy, vstupy pre generátory, logy/reporty výstupov.</p></body></html></richcontent>
      <node TEXT="fm_schema.json"/>
      <node TEXT="nav_config.json"/>
      <node TEXT="input/"/>
      <node TEXT="output/"/>
    </node>

    <!-- PUBLICATION -->
    <node TEXT="publication/">
      <richcontent TYPE="NOTE"><html><body><p>Staging build artefaktov pre jednotlivé generátory. Originál v content/ sa nikdy neprepíše.</p></body></html></richcontent>
      <node TEXT="sites/"/>
      <node TEXT="docusaurus/docs/"/>
    </node>

  </node>
</map>