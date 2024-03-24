<div class="acp-page-container">
	<div component="settings/main/header" class="row border-bottom py-2 m-0 sticky-top acp-page-main-header align-items-center">
		<div class="col-12 col-md-8 px-0 mb-1 mb-md-0">
			<h4 class="fw-bold tracking-tight mb-0">{title}</h4>
		</div>
	</div>

	<div class="row m-0">
		<div id="spy-container" class="col-12 px-0 mb-4" tabindex="0">
			<div class="d-flex flex-column gap-1">
				<label class="form-label">If this is the first time you activated this plugin click the below button to recalculate total votes for all topics</label>
				<button id="recalculate" class="btn btn-primary btn-sm">Recalculate Votes</button>
			</div>
			<hr/>
			<div class="d-flex flex-column gap-1">
				<label class="form-label">If you are going to uninstall this plugin click the below button to revert the votes to their original values</label>
				<button id="revert" class="btn btn-primary btn-sm">Revert Votes</button>
			</div>
		</div>

		<!-- IMPORT admin/partials/settings/toc.tpl -->
	</div>
</div>
