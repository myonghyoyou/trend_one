$(document).ready(function(){
	$('#modalAlert').hide();
	$('#modalCnfrm').hide();
	$('#modalBigImg').hide();
});

var alertObj = "";
var actDivi = "";
function openAlert( msg, succYn, callback )
{
	let alertModal = new bootstrap.Modal(document.getElementById('modalAlert'));

	alertObj = alertModal;
	
	$("#modalAlertTitleErr").hide();
	$("#modalAlertTitleSucc").hide();
	$("#modalAlertBtnErr").hide();
	$("#modalAlertBtnSucc").hide();
	
	if( succYn == "FAIL" )
	{
		
		$("#modalAlertTitleErr").show();
		$("#modalAlertBtnErr").show();
	}
	else 
	{
		$("#modalAlertTitleSucc").show();
		$("#modalAlertBtnSucc").show();
	}
	
	$("#modalAlertBody").html(msg);

	if(callback) {
		alertModal._element.addEventListener("hide.bs.modal", (e) => {
			eval(callback);
		})
	}

	alertModal.show();
}

function closeAlert()
{
	alertObj.hide();
	if( alertObj != "" )
	{
		//setTimeout(alertObj,10);
		alertObj="";
	}
}

var confirmObj = "";
var confirmCloseObj = "";
let okFunc = "";
var popTopPosChk = 0;


function openConfirm( msg, okCallback, closeObj )
{
	closePrgss();

	confirmModal =  new bootstrap.Modal(document.getElementById('modalCnfrm'));
	confirmObj = confirmModal;
	okFunc = okCallback;

	if( closeObj ) confirmCloseObj = closeObj;

	$("#modalCnfrmBody").html(msg);
	
	confirmObj.show();
}

function closeConfirm()
{
	confirmObj.hide();
	confirmObj = "";
	
	if( confirmCloseObj != "" )
	{
		setTimeout(confirmCloseObj,10);
		confirmCloseObj = "";
	}
}

function okConfirm()
{
	okFunc();
	okFunc = "";
	closeConfirm();
}

var prgssPos = 0;
var mTmr="";
function openPrgss( msg )
{
	if( msg )
	{
		$("font#progMsg").html(msg);
	}
	
	prgssPos = 0
	$("#modalPrgss").fadeIn( 500 );

	mTmr = setTimeout("prgssAct()",10);
}

function prgssAct(  )
{
	
	clearTimeout(mTmr);
	$("div#prgssBlock0").css("background", "#ffffff");
	$("div#prgssBlock1").css("background", "#ffffff");
	$("div#prgssBlock2").css("background", "#ffffff");
	$("div#prgssBlock3").css("background", "#ffffff");

	var prgssId = "div#prgssBlock"+prgssPos;
	
	$(prgssId).css("background", "#11cdef");
	prgssPos++;
	if( prgssPos == 4 )prgssPos=0;
	mTmr = setTimeout("prgssAct()",500);
}

function closePrgss()
{
	$("#modalPrgss").fadeOut( 500 );
	clearTimeout(mTmr);
}

function openBigImg( strPath )
{
	$("img#modalBigImgSrc").attr('src', strPath);
	$("div#modalBigImg").css("display", "");
}

function closeBigImg()
{
	$("div#modalBigImg").css("display", "none");
}

function openAdo( strPath )
{
	$("audio#modalAdoSrc").attr('src', strPath);
	$("div#modalAdoPlyr").css("display", "");
}

function closeAdo()
{
	$("audio#modalAdoSrc").attr('src', "");
	$("div#modalAdoPlyr").css("display", "none");
}